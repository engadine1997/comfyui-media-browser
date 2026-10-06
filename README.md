# comfyui-media-browser

An explorer-style browser for ComfyUI's `input` and `output` folders. Open it with the
**Media** button in the top action bar (next to Manager / Run / Queue), or bind the
`Toggle Media Browser` command to a key.

## Features

- **Explorer window**: back, forward, and up buttons; a clickable breadcrumb (click the empty part of the address bar to type a path such as `output/sub`); a folder tree; a status bar; resizable, movable, and maximizable.
- **Views**: large icons with a size slider (Ctrl+Wheel) or a details list with sortable columns. You can sort by name (natural order), date, size, or type, filter to All, Images, or Videos, and search by name.
- **Thumbnails**: images are thumbnailed with Pillow, and videos with PyAV (one frame about 10% in, at most 3 s). Video tiles show a duration badge and play a muted preview on hover. Folder tiles show a mosaic of their most recent images and videos (1–4 of them) and an item count. A folder with no media of its own shows images from its most recent subfolders, up to two levels down.
- **Viewer**: double-click, Enter, or **View** opens it. Images support wheel zoom, drag to pan, double-click or `F` to switch between fit and 1:1, and `+`/`-`. Videos play in a player that supports seeking. ←/→ steps through the media in the folder and skips non-media files.
- **Context menu**:
  - View
  - View in new tab
  - Load workflow
  - Cut / Copy
  - Copy to Input/Output
  - Save (a single file, or a zip for multiple items or folders)
  - Rename
  - Delete
  - Properties: size, dates, dimensions, format, codec, frame rate, duration, frame count, bitrate, audio, and whether ComfyUI metadata is embedded
- **File management**:
  - Upload with the button, by dropping files from the OS, or by pasting an image (`Ctrl+V`).
  - New folder, rename, and delete. Delete asks for confirmation.
  - Drag onto a folder, tree node, or breadcrumb to move. Hold `Ctrl` to copy. Dragging between Input and Output copies.
  - `Ctrl+X` / `Ctrl+C` then` Ctrl+V` to move or copy between folders.
- **Selection**: click, `Ctrl+click`, `Shift+click`, rubber-band drag, `Ctrl+A`.
- **Keyboard**:
  - Arrow keys, `Home`/`End`, and `PgUp`/`PgDn` move the focus. Add `Shift` to extend the selection, or hold `Ctrl` to move without selecting (`Ctrl+Space` toggles).
  - Enter opens, Backspace or Alt+↑ goes up, Alt+←/→ goes back/forward.
  - `F2` renames, `Del` deletes, `F5` refreshes, `Ctrl+F` searches, `Alt+Enter` shows properties.
  - Typing letters jumps to the first matching name.
- **Live**: when a prompt finishes, the Output view refreshes itself.

# Performance
- Highly performant, featuring **server-side paging with virtual scrolling** and extensive **caching**.

## Disclaimer
This was entirely vibe-coded with **Claude Code**. I am a programmer and have reviewed the code, and it works well in my testing and for my use cases.
