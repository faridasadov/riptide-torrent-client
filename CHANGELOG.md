# Changelog

All user-visible changes bump the patch version by one step.

## 0.1.27

- Desktop backend packaging now resolves `PyInstaller` from the backend virtualenv automatically.
- Removed the host `PATH` dependency from the Linux and Windows desktop backend build step.

## 0.1.26

- Aligned release metadata and About versioning with the current Tauri desktop line.
- Cleaned up desktop documentation to reflect Tauri packaging instead of the old Electron shell.

## 0.1.11

- Completed torrents now show completed state instead of paused state in the list.
- Torrent row action icon now switches to a completed check icon after finishing.
- Completed status and pill priority now override paused state in the main list.

## 0.1.10

- Added clickable table headers, checkbox multi-select and better bulk actions in table view.
- Improved add-torrent preview with a file tree and per-file priority controls.
- Added preview-wide skip, normal and high priority actions.
- Improved localized sort labels in the torrent toolbar.

## 0.1.9

- Added cards/table torrent list toggle with a persistent UI preference.
- Expanded add-torrent flow with rename-before-add and tracker override support.
- Added an RSS regex rule shortcut and regex-aware rule testing.
- Completed desktop magnet and `.torrent` handoff flow with local file import.

## 0.1.8

- Fixed torrent file creation for directory-based fixtures and local content.
- Validated delete-with-files using a controlled fixture.
- Continued version line correctly from `0.1.7` to `0.1.8`.

## 0.1.7

- Fixed storage `Actions` button so the file tools menu stays open.
- Added centralized release manifest in `release.json`.
- Added torrent move-content, force-start, peer block and port status features.
- Added tracker reorder controls and next-announce timing in the UI.
- Added optional skip-hash-check for `.torrent` imports.

## 0.1.6

- Fixed settings save button visibility in light mode.
- Added responsive detail pane overlay on smaller screens.
- Improved Pearl light contrast.
- Added changelog to About modal.

## 0.1.5

- Fixed Pearl light theme visuals.
- Improved graph, card shadow and toggle contrast.

## 0.1.4

- Completed EN/AZ/RU settings translation coverage.
- Polished privacy settings translation strings.

## 0.1.3

- Moved version tracking into a dedicated source.
