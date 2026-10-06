import asyncio
import hashlib
import json
import logging
import mimetypes
import os
import re
import shutil
import tempfile
import threading
import time
import urllib.parse
import zipfile
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor

from aiohttp import web
from PIL import Image, ImageOps

import folder_paths
from server import PromptServer

try:
    import av
except ImportError:  # video thumbnails/metadata degrade gracefully without PyAV
    av = None

log = logging.getLogger("MediaBrowser")

ROOTS = {
    "input": folder_paths.get_input_directory,
    "output": folder_paths.get_output_directory,
}

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".avif", ".jfif"}
VIDEO_EXTS = {".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v", ".mpg", ".mpeg", ".wmv", ".flv"}
THUMB_SIZES = (128, 256, 384, 512)
INVALID_NAME = re.compile(r'[<>:"/\\|?*\x00-\x1f]')

for ext, mime in ((".webp", "image/webp"), (".avif", "image/avif"), (".mp4", "video/mp4"),
                  (".webm", "video/webm"), (".mkv", "video/x-matroska"), (".m4v", "video/mp4"),
                  (".mov", "video/quicktime")):
    mimetypes.add_type(mime, ext)

CACHE_DIR = os.path.join(folder_paths.get_user_directory(), "media_browser_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Thumbnail decoding is CPU bound; keep it off the event loop and bounded so a
# fast scroll through thousands of files cannot starve the rest of ComfyUI.
_executor = ThreadPoolExecutor(max_workers=max(2, min(8, (os.cpu_count() or 4) // 2)),
                               thread_name_prefix="media_browser")
_inflight: dict[str, asyncio.Future] = {}


def kind_of(name: str) -> str:
    ext = os.path.splitext(name)[1].lower()
    if ext in IMAGE_EXTS:
        return "image"
    if ext in VIDEO_EXTS:
        return "video"
    return "file"


def root_dir(root: str) -> str:
    if root not in ROOTS:
        raise web.HTTPBadRequest(text=f"Unknown root '{root}'")
    return os.path.realpath(ROOTS[root]())


def resolve(root: str, rel: str) -> str:
    """Map a root-relative path to an absolute one, refusing anything that escapes the root."""
    base = root_dir(root)
    rel = (rel or "").replace("\\", "/").strip("/")
    full = os.path.realpath(os.path.join(base, rel))
    if os.path.commonpath([base, full]) != base:
        raise web.HTTPForbidden(text="Path outside of root")
    return full


def check_name(name: str) -> str:
    name = (name or "").strip()
    if not name or name in (".", "..") or INVALID_NAME.search(name) or name.endswith("."):
        raise web.HTTPBadRequest(text=f"Invalid name '{name}'")
    return name


def unique_path(path: str) -> str:
    if not os.path.exists(path):
        return path
    stem, ext = os.path.splitext(path)
    if os.path.isdir(path):
        stem, ext = path, ""
    i = 1
    while os.path.exists(f"{stem} ({i}){ext}"):
        i += 1
    return f"{stem} ({i}){ext}"


# ---------------------------------------------------------------- listing ---

def natural_key(s: str):
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", s.lower())]


class DirCache:
    """Caches scandir results per directory, invalidated by the directory's mtime.

    Adding, removing or renaming an entry bumps the directory mtime, which is all
    a listing needs. Sorted views are memoised alongside the raw entries.
    """

    def __init__(self, capacity=64):
        self.capacity = capacity
        self.data: OrderedDict[str, tuple[int, list, dict]] = OrderedDict()
        self.lock = threading.Lock()

    def entries(self, path: str, fresh=False):
        mtime = os.stat(path).st_mtime_ns
        with self.lock:
            hit = self.data.get(path)
            if hit and hit[0] == mtime and not fresh:
                self.data.move_to_end(path)
                return hit
        items = []
        with os.scandir(path) as it:
            for e in it:
                if e.name.startswith("."):
                    continue
                try:
                    is_dir = e.is_dir()
                    st = e.stat()
                except OSError:
                    continue
                items.append({
                    "name": e.name,
                    "kind": "dir" if is_dir else kind_of(e.name),
                    "size": 0 if is_dir else st.st_size,
                    "mtime": st.st_mtime,
                })
        entry = (mtime, items, {})
        with self.lock:
            self.data[path] = entry
            while len(self.data) > self.capacity:
                self.data.popitem(last=False)
        return entry

    def sorted(self, path: str, sort: str, desc: bool, fresh=False):
        _, items, views = self.entries(path, fresh)
        key = (sort, desc)
        if key not in views:
            keyfn = {
                "name": lambda i: natural_key(i["name"]),
                "mtime": lambda i: i["mtime"],
                "size": lambda i: i["size"],
                "type": lambda i: (os.path.splitext(i["name"])[1].lower(), natural_key(i["name"])),
            }.get(sort, lambda i: natural_key(i["name"]))
            dirs = sorted((i for i in items if i["kind"] == "dir"),
                          key=keyfn if sort != "size" else (lambda i: natural_key(i["name"])),
                          reverse=desc and sort != "size")
            files = sorted((i for i in items if i["kind"] != "dir"), key=keyfn, reverse=desc)
            views[key] = dirs + files
        return views[key]


dir_cache = DirCache(capacity=512)


def list_dir(root, rel, sort, desc, q, kinds, offset, limit, fresh):
    path = resolve(root, rel)
    if not os.path.isdir(path):
        raise web.HTTPNotFound(text="Folder not found")
    items = dir_cache.sorted(path, sort, desc, fresh)
    if q or kinds:
        q = q.lower()
        items = [i for i in items
                 if (not q or q in i["name"].lower()) and (not kinds or i["kind"] == "dir" or i["kind"] in kinds)]
    return {"total": len(items), "offset": offset, "items": items[offset:offset + limit]}


def list_subdirs(root, rel):
    path = resolve(root, rel)
    out = []
    for i in dir_cache.sorted(path, "name", False):
        if i["kind"] != "dir":
            break
        has_children = False
        try:
            with os.scandir(os.path.join(path, i["name"])) as it:
                has_children = any(e.is_dir() and not e.name.startswith(".") for e in it)
        except OSError:
            pass
        out.append({"name": i["name"], "has_children": has_children})
    return out


def folder_preview(root, rel, limit=4):
    """Most recent media in a folder for its tile mosaic.

    Empty-handed folders borrow from their most recent subfolders (two levels,
    a few folders each) so organising outputs into folders keeps them recognisable.
    """
    path = resolve(root, rel)
    items = dir_cache.sorted(path, "mtime", True)
    picks = []

    def collect(folder_rel, entries, depth):
        for i in entries:
            if len(picks) >= limit:
                return
            if i["kind"] in ("image", "video"):
                picks.append({"path": f"{folder_rel}/{i['name']}" if folder_rel else i["name"],
                              "kind": i["kind"], "mtime": i["mtime"], "size": i["size"]})
        if depth == 0:
            return
        for d in [i for i in entries if i["kind"] == "dir"][:3]:
            if len(picks) >= limit:
                return
            sub_rel = f"{folder_rel}/{d['name']}" if folder_rel else d["name"]
            try:
                collect(sub_rel, dir_cache.sorted(resolve(root, sub_rel), "mtime", True), depth - 1)
            except OSError:
                pass

    collect(rel, items, 2)
    return {"count": len(items), "items": picks}


# ------------------------------------------------------------- thumbnails ---

def open_video_frame(path: str) -> Image.Image:
    with av.open(path) as c:
        vs = c.streams.video[0]
        vs.thread_type = "AUTO"
        duration = c.duration / 1_000_000 if c.duration else 0
        # Skip likely fade-ins/black leaders: 10% in, but never more than 3s.
        target = min(duration * 0.1, 3.0) if duration else 0
        if target > 0 and vs.time_base:
            c.seek(int(target / vs.time_base), stream=vs, backward=True, any_frame=False)
        frame = None
        for i, f in enumerate(c.decode(vs)):
            frame = f
            if f.time is None or f.time >= target or i > 90:
                break
        if frame is None:
            raise ValueError("No decodable video frame")
        return frame.to_image()


def make_thumb(path: str, kind: str, size: int, dest: str):
    if kind == "video":
        if av is None:
            raise ValueError("PyAV not installed")
        img = open_video_frame(path)
    else:
        img = Image.open(path)
        img.draft("RGB", (size * 2, size * 2))  # JPEG: decode at reduced scale
        img = ImageOps.exif_transpose(img)
    img.thumbnail((size, size), Image.Resampling.LANCZOS if img.width < size * 4 else Image.Resampling.BILINEAR,
                  reducing_gap=2.0)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.getbands() or img.mode == "P" else "RGB")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = f"{dest}.{threading.get_ident()}.tmp"
    img.save(tmp, "WEBP", quality=80, method=2)
    os.replace(tmp, dest)


async def get_thumb(path: str, size: int) -> str:
    st = os.stat(path)
    key = hashlib.sha1(f"{path}|{st.st_mtime_ns}|{st.st_size}|{size}".encode()).hexdigest()
    dest = os.path.join(CACHE_DIR, "thumbs", key[:2], key + ".webp")
    if os.path.exists(dest):
        return dest
    fut = _inflight.get(key)
    if fut is None:
        loop = asyncio.get_running_loop()
        fut = loop.run_in_executor(_executor, make_thumb, path, kind_of(path), size, dest)
        _inflight[key] = fut
        fut.add_done_callback(lambda _: _inflight.pop(key, None))
    await asyncio.shield(fut)
    return dest


# --------------------------------------------------------------- metadata ---

_probe_cache: OrderedDict[tuple, dict] = OrderedDict()
_probe_lock = threading.Lock()


def fraction(v):
    return float(v) if v is not None else None


def probe(path: str) -> dict:
    st = os.stat(path)
    key = (path, st.st_mtime_ns, st.st_size)
    with _probe_lock:
        if key in _probe_cache:
            return _probe_cache[key]
    kind = kind_of(path)
    info: dict = {}
    try:
        if kind == "image":
            with Image.open(path) as img:
                info.update(width=img.width, height=img.height, format=img.format, mode=img.mode)
                frames = getattr(img, "n_frames", 1)
                if frames > 1:
                    info["frames"] = frames
                    if img.info.get("duration"):
                        info["duration"] = frames * img.info["duration"] / 1000
                        info["fps"] = round(1000 / img.info["duration"], 3)
                if img.info.get("dpi"):
                    info["dpi"] = [round(float(d)) for d in img.info["dpi"]]
                text = getattr(img, "text", None) or {}
                info["has_workflow"] = "workflow" in text
                info["has_prompt"] = "prompt" in text
        elif kind == "video" and av is not None:
            with av.open(path) as c:
                info["format"] = c.format.long_name or c.format.name
                if c.duration:
                    info["duration"] = c.duration / 1_000_000
                if c.bit_rate:
                    info["bitrate"] = c.bit_rate
                if c.streams.video:
                    vs = c.streams.video[0]
                    rate = vs.average_rate or vs.guessed_rate or vs.base_rate
                    info.update(width=vs.codec_context.width, height=vs.codec_context.height,
                                codec=vs.codec_context.name, pix_fmt=vs.codec_context.pix_fmt,
                                fps=round(fraction(rate), 3) if rate else None)
                    frames = vs.frames
                    if not frames and rate and info.get("duration"):
                        frames = round(info["duration"] * fraction(rate))
                    info["frames"] = frames or None
                if c.streams.audio:
                    a = c.streams.audio[0].codec_context
                    info["audio"] = {"codec": a.name, "sample_rate": a.sample_rate,
                                     "channels": getattr(a, "channels", None) or a.layout.nb_channels}
                else:
                    info["audio"] = None
    except Exception as e:  # unreadable/corrupt media still gets file properties
        info["error"] = str(e)
    with _probe_lock:
        _probe_cache[key] = info
        while len(_probe_cache) > 4096:
            _probe_cache.popitem(last=False)
    return info


# ----------------------------------------------------------------- routes ---

routes = PromptServer.instance.routes


def run(fn, *args):
    return asyncio.get_running_loop().run_in_executor(None, fn, *args)


async def read_json(request):
    try:
        return await request.json()
    except json.JSONDecodeError:
        raise web.HTTPBadRequest(text="Invalid JSON")


def error_response(e: Exception):
    if isinstance(e, web.HTTPException):
        raise e
    if isinstance(e, FileNotFoundError):
        raise web.HTTPNotFound(text=str(e))
    if isinstance(e, FileExistsError):
        raise web.HTTPConflict(text=str(e))
    if isinstance(e, PermissionError):
        raise web.HTTPForbidden(text=str(e))
    raise web.HTTPInternalServerError(text=str(e))


@routes.get("/mediabrowser/list")
async def list_route(request):
    q = request.query
    kinds = {k for k in q.get("kinds", "").split(",") if k}
    try:
        data = await run(list_dir, q.get("root", "output"), q.get("path", ""), q.get("sort", "name"),
                         q.get("desc") == "1", q.get("q", ""), kinds, max(0, int(q.get("offset", 0))),
                         max(1, min(1000, int(q.get("limit", 200)))), q.get("fresh") == "1")
    except Exception as e:
        error_response(e)
    return web.json_response(data)


@routes.get("/mediabrowser/dirs")
async def dirs_route(request):
    try:
        data = await run(list_subdirs, request.query.get("root", "output"), request.query.get("path", ""))
    except Exception as e:
        error_response(e)
    return web.json_response(data)


@routes.get("/mediabrowser/thumb")
async def thumb_route(request):
    q = request.query
    path = resolve(q.get("root", "output"), q.get("path", ""))
    size = min(THUMB_SIZES, key=lambda s: abs(s - int(q.get("s", 256))))
    if not os.path.isfile(path) or kind_of(path) == "file":
        raise web.HTTPNotFound()
    try:
        dest = await get_thumb(path, size)
    except FileNotFoundError:
        raise web.HTTPNotFound()
    except Exception as e:
        log.debug("thumbnail failed for %s: %s", path, e)
        raise web.HTTPUnsupportedMediaType(text=str(e))
    # The URL carries the file's mtime, so a changed file gets a new URL.
    return web.FileResponse(dest, headers={"Cache-Control": "public, max-age=31536000, immutable",
                                           "Content-Type": "image/webp"})


@routes.get("/mediabrowser/file")
async def file_route(request):
    q = request.query
    path = resolve(q.get("root", "output"), q.get("path", ""))
    if not os.path.isfile(path):
        raise web.HTTPNotFound()
    disposition = "attachment" if q.get("download") == "1" else "inline"
    name = urllib.parse.quote(os.path.basename(path))
    headers = {"Content-Disposition": f"{disposition}; filename*=UTF-8''{name}", "Cache-Control": "no-cache"}
    ctype = mimetypes.guess_type(path)[0]
    if ctype:
        headers["Content-Type"] = ctype
    return web.FileResponse(path, headers=headers)


@routes.post("/mediabrowser/meta")
async def meta_route(request):
    body = await read_json(request)
    root = body.get("root", "output")
    paths = body.get("paths", [])[:500]

    def work():
        out = {}
        for rel in paths:
            try:
                info = probe(resolve(root, rel))
                out[rel] = {k: info.get(k) for k in ("width", "height", "duration", "fps")}
            except Exception:
                out[rel] = None
        return out

    return web.json_response(await run(work))


@routes.post("/mediabrowser/folders")
async def folders_route(request):
    body = await read_json(request)
    root = body.get("root", "output")
    paths = body.get("paths", [])[:200]

    def work():
        out = {}
        for rel in paths:
            try:
                out[rel] = folder_preview(root, rel)
            except Exception:
                out[rel] = None
        return out

    return web.json_response(await run(work))


@routes.get("/mediabrowser/info")
async def info_route(request):
    root = request.query.get("root", "output")
    rel = request.query.get("path", "")
    path = resolve(root, rel)

    def work():
        st = os.stat(path)
        is_dir = os.path.isdir(path)
        data = {
            "name": os.path.basename(path) or root,
            "path": rel,
            "root": root,
            "location": os.path.dirname(path),
            "kind": "dir" if is_dir else kind_of(path),
            "mime": None if is_dir else mimetypes.guess_type(path)[0],
            "size": st.st_size,
            "created": st.st_ctime,
            "modified": st.st_mtime,
            "accessed": st.st_atime,
        }
        if is_dir:
            files = dirs = total = 0
            for base, dnames, fnames in os.walk(path):
                dirs += len(dnames)
                files += len(fnames)
                for f in fnames:
                    try:
                        total += os.path.getsize(os.path.join(base, f))
                    except OSError:
                        pass
            data.update(size=total, files=files, dirs=dirs)
        elif data["kind"] != "file":
            data["media"] = probe(path)
        return data

    try:
        return web.json_response(await run(work))
    except Exception as e:
        error_response(e)


@routes.post("/mediabrowser/upload")
async def upload_route(request):
    reader = await request.multipart()
    root, rel, saved = "input", "", []
    try:
        async for part in reader:
            if part.name == "root":
                root = (await part.text()).strip()
            elif part.name == "path":
                rel = (await part.text()).strip()
            elif part.name == "file" and part.filename:
                folder = resolve(root, rel)
                os.makedirs(folder, exist_ok=True)
                dest = unique_path(os.path.join(folder, check_name(os.path.basename(part.filename))))
                tmp = dest + ".uploading"
                with open(tmp, "wb") as f:
                    while chunk := await part.read_chunk(1 << 20):
                        f.write(chunk)
                os.replace(tmp, dest)
                saved.append(os.path.basename(dest))
    except Exception as e:
        error_response(e)
    return web.json_response({"saved": saved})


@routes.post("/mediabrowser/delete")
async def delete_route(request):
    body = await read_json(request)
    root = body.get("root", "output")

    def work():
        deleted, errors = [], {}
        for rel in body.get("paths", []):
            try:
                path = resolve(root, rel)
                if path == root_dir(root):
                    raise PermissionError("Cannot delete the root folder")
                if os.path.isdir(path):
                    shutil.rmtree(path)
                else:
                    os.remove(path)
                deleted.append(rel)
            except Exception as e:
                errors[rel] = str(e)
        return {"deleted": deleted, "errors": errors}

    return web.json_response(await run(work))


@routes.post("/mediabrowser/rename")
async def rename_route(request):
    body = await read_json(request)
    root = body.get("root", "output")
    try:
        src = resolve(root, body.get("path", ""))
        if src == root_dir(root) or not os.path.exists(src):
            raise web.HTTPBadRequest(text="Nothing to rename")
        dest = resolve(root, os.path.join(os.path.dirname(body["path"]), check_name(body.get("name"))))
        # Allow case-only renames on case-insensitive filesystems.
        if os.path.exists(dest) and os.path.normcase(dest) != os.path.normcase(src):
            raise FileExistsError(f"'{os.path.basename(dest)}' already exists")
        os.rename(src, dest)
    except Exception as e:
        error_response(e)
    return web.json_response({"name": os.path.basename(dest)})


@routes.post("/mediabrowser/mkdir")
async def mkdir_route(request):
    body = await read_json(request)
    root = body.get("root", "output")
    try:
        parent = resolve(root, body.get("path", ""))
        dest = unique_path(os.path.join(parent, check_name(body.get("name", "New folder"))))
        os.makedirs(dest)
    except Exception as e:
        error_response(e)
    return web.json_response({"name": os.path.basename(dest)})


@routes.post("/mediabrowser/transfer")
async def transfer_route(request):
    """Move or copy entries, possibly between the input and output roots."""
    body = await read_json(request)
    op = body.get("op", "copy")
    src_root, dst_root = body.get("src_root", "output"), body.get("dst_root", "output")

    def work():
        dst_dir = resolve(dst_root, body.get("dst_path", ""))
        if not os.path.isdir(dst_dir):
            raise FileNotFoundError("Destination folder not found")
        done, errors = [], {}
        for rel in body.get("paths", []):
            try:
                src = resolve(src_root, rel)
                if src == root_dir(src_root):
                    raise PermissionError("Cannot transfer the root folder")
                if os.path.isdir(src) and os.path.commonpath([src, dst_dir]) == src:
                    raise ValueError("Cannot place a folder inside itself")
                if op == "move" and os.path.dirname(src) == dst_dir:
                    continue
                dest = unique_path(os.path.join(dst_dir, os.path.basename(src)))
                if op == "move":
                    shutil.move(src, dest)
                elif os.path.isdir(src):
                    shutil.copytree(src, dest)
                else:
                    shutil.copy2(src, dest)
                done.append(os.path.basename(dest))
            except Exception as e:
                errors[rel] = str(e)
        return {"done": done, "errors": errors}

    try:
        return web.json_response(await run(work))
    except Exception as e:
        error_response(e)


@routes.post("/mediabrowser/zip")
async def zip_route(request):
    body = await read_json(request)
    root = body.get("root", "output")
    paths = [resolve(root, rel) for rel in body.get("paths", [])]

    def work():
        fd, tmp = tempfile.mkstemp(suffix=".zip")
        os.close(fd)
        # Media is already compressed; storing is much faster and barely larger.
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_STORED, allowZip64=True) as z:
            for p in paths:
                if os.path.isdir(p):
                    for base, _, files in os.walk(p):
                        for f in files:
                            full = os.path.join(base, f)
                            z.write(full, os.path.relpath(full, os.path.dirname(p)))
                elif os.path.isfile(p):
                    z.write(p, os.path.basename(p))
        return tmp

    tmp = await run(work)
    name = f"media_{time.strftime('%Y%m%d_%H%M%S')}.zip"
    resp = web.StreamResponse(headers={"Content-Type": "application/zip",
                                       "Content-Disposition": f'attachment; filename="{name}"',
                                       "Content-Length": str(os.path.getsize(tmp))})
    await resp.prepare(request)
    try:
        with open(tmp, "rb") as f:
            while chunk := await run(f.read, 1 << 20):
                await resp.write(chunk)
    finally:
        os.remove(tmp)
    await resp.write_eof()
    return resp
