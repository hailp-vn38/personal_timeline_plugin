# Personal Timeline Check-in

Personal Timeline Check-in is an Obsidian plugin for capturing short daily check-ins in a right sidebar timeline. It stores data locally in your vault as markdown-first timeline files, with attachment files saved separately in the vault.

## What it does

- Opens a dedicated right sidebar timeline view.
- Creates daily timeline files automatically.
- Saves each entry as a markdown block with hidden JSON metadata.
- Supports text notes, images, files, and audio recordings.
- Lets you search and filter by text, tag, time range, and date preset.
- Supports opening the source entry, editing, duplicating, and deleting entries.

## Storage model

The plugin is local-first and markdown-first:

- Daily timeline files are stored under `Timeline/YYYY/MM/YYYY-MM-DD.md` by default.
- Attachments are stored under `Timeline Attachments/YYYY/MM/`.
- File-level metadata is stored in frontmatter.
- Entry-level metadata is stored in an HTML comment block inside each entry.

Example entry format:

```md
## 08:15 ^tl-20260520-081500-a3f9

<!-- timeline-entry
{
  "schemaVersion": 1,
  "id": "tl-20260520-081500-a3f9",
  "type": "checkin",
  "date": "2026-05-20",
  "time": "08:15",
  "createdAt": "2026-05-20T08:15:00.000Z",
  "updatedAt": "2026-05-20T08:15:00.000Z",
  "tags": ["health", "morning"],
  "source": "manual",
  "attachments": []
}
-->

Slept a bit less than usual, but energy is still decent.
```

## Install for local development

1. Place this plugin folder under your vault at:
   `<Vault>/.obsidian/plugins/personal-timeline/`
2. Install dependencies:
   `npm install`
3. Build once:
   `npm run build`
4. Reload Obsidian.
5. Enable **Personal Timeline Check-in** in **Settings → Community plugins**.

## Development

- `npm run dev`: watch mode
- `npm run build`: production build
- `npm run lint`: lint the project

## Current capabilities

- Right sidebar timeline view
- Quick composer for text entries
- Image, file, and audio attachments
- Search and filters
- Edit, duplicate, delete
- Source jumping to block IDs
- Broken metadata warning banner for malformed entries

## Settings

- `Timeline folder`
- `Attachment folder`
- `File organization`
- `Default view`
- `Time format`

## Notes

- The plugin does not automatically delete attachment files when an entry is deleted.
- Mobile support has not been fully verified yet.
- If a timeline entry contains invalid metadata JSON, the plugin skips it and shows a warning banner instead of crashing.
