# Tài liệu phát triển plugin Obsidian: Personal Timeline Check-in

## 1. Tổng quan ý tưởng

Plugin này là một plugin cá nhân cho Obsidian, dùng để ghi lại các check-in trong ngày theo dạng timeline. Người dùng có thể mở một giao diện ở sidebar bên phải của Obsidian để nhanh chóng ghi chú, xem lại các sự kiện trong ngày, lọc theo tag, thời gian, nội dung, và đính kèm các loại dữ liệu như text, image, file hoặc file ghi âm.

Triết lý thiết kế chính:

- Local-first: dữ liệu nằm trong vault Obsidian của người dùng.
- Markdown-first: dữ liệu chính được lưu dưới dạng Markdown để vẫn đọc được khi plugin không hoạt động.
- Plugin metadata được lưu bằng JSON ẩn trong comment HTML bên trong từng block timeline.
- Attachment được lưu thành file thật trong vault, không nhúng base64 vào Markdown.
- UI chỉ là lớp hiển thị và thao tác nhanh, không khóa dữ liệu vào plugin.

---

## 2. Mục tiêu chính

Plugin cần hỗ trợ các chức năng sau:

1. Tạo timeline hằng ngày.
2. Hiển thị timeline theo dòng thời gian trong ngày.
3. Giao diện nằm ở sidebar bên phải của Obsidian.
4. Cho phép tạo nhanh check-in.
5. Hỗ trợ nội dung text.
6. Hỗ trợ image attachment.
7. Hỗ trợ file attachment.
8. Hỗ trợ ghi âm và lưu audio file.
9. Có search/filter theo nội dung.
10. Có filter theo tag.
11. Có filter theo thời gian.
12. Có thiết lập thư mục lưu trữ trong plugin settings.
13. Dùng Obsidian Properties/frontmatter cho metadata cấp file.
14. Dùng comment JSON ẩn trong từng block để lưu metadata entry.

---

## 3. Kiến trúc tổng thể

Plugin nên được chia thành các lớp sau:

```txt
UI Layer
- Right sidebar timeline view
- Check-in composer
- Search/filter toolbar
- Timeline card renderer

Application Layer
- Create timeline entry
- Update timeline entry
- Delete timeline entry
- Filter/search/sort entries
- Attachment handling

Storage Layer
- Markdown daily files
- Attachment files
- Plugin settings/data.json

Index Layer
- Parse timeline files
- Extract hidden JSON metadata
- Build in-memory index
- Watch vault changes

Obsidian Integration Layer
- Plugin lifecycle
- Custom ItemView
- Commands
- Ribbon icon
- Settings tab
```

---

## 4. UI hiển thị

### 4.1. Right sidebar view

Plugin nên tạo một custom view riêng bằng `ItemView`, ví dụ:

```ts
const VIEW_TYPE_TIMELINE = "personal-timeline-view";
```

View này được mở ở sidebar bên phải của Obsidian.

Layout đề xuất:

```txt
┌──────────────────────────────────┐
│ Today / Date selector             │
│ Search... #tag time range         │
├──────────────────────────────────┤
│ + Quick check-in                  │
├──────────────────────────────────┤
│ 08:15  Morning check-in           │
│       text / image / audio        │
│                                  │
│ 10:42  Meeting note               │
│       file attachment             │
│                                  │
│ 22:10  Reflection                 │
└──────────────────────────────────┘
```

### 4.2. Component UI chính

```txt
TimelineView
├── TimelineToolbar
│   ├── DatePicker
│   ├── SearchInput
│   ├── TagFilter
│   └── TimeRangeFilter
├── CheckInComposer
│   ├── TextEditor
│   ├── TagInput
│   ├── AttachmentPicker
│   └── AudioRecorder
└── TimelineList
    └── TimelineCard
        ├── MarkdownPreview
        ├── AttachmentPreview
        └── ActionsMenu
```

### 4.3. Timeline card

Mỗi card timeline nên hiển thị:

- Giờ check-in.
- Title ngắn nếu có.
- Preview nội dung markdown.
- Tag.
- Attachment preview.
- Menu hành động: edit, delete, duplicate, jump to source.

Nên hỗ trợ hai chế độ hiển thị:

```txt
Compact mode:
- Chỉ hiển thị giờ, title, preview ngắn.

Expanded mode:
- Hiển thị đầy đủ markdown, image, audio, file.
```

---

## 5. Lưu trữ dữ liệu

### 5.1. Nguyên tắc lưu trữ

Không nên lưu toàn bộ timeline trong một file JSON duy nhất. Dữ liệu chính nên nằm trong Markdown để:

- Người dùng vẫn đọc được nếu plugin tắt.
- Dữ liệu dễ backup, sync, version control.
- Obsidian search/link/tag vẫn có thể hoạt động.
- Không bị lock-in vào plugin.

### 5.2. Cấu trúc thư mục đề xuất

```txt
Vault/
  Timeline/
    2026/
      05/
        2026-05-20.md
        2026-05-21.md
  Timeline Attachments/
    2026/
      05/
        2026-05-20_081530_image.png
        2026-05-20_104210_audio.webm
  .obsidian/
    plugins/
      personal-timeline/
        data.json
```

### 5.3. Mỗi ngày là một file Markdown

Khuyến nghị mặc định là lưu mỗi ngày thành một file:

```txt
Timeline/YYYY/MM/YYYY-MM-DD.md
```

Ví dụ:

```txt
Timeline/2026/05/2026-05-20.md
```

Ưu điểm:

- Dễ đọc lại theo ngày.
- Không tạo quá nhiều file nhỏ.
- Dễ export hoặc review ngày.
- Hợp với ý tưởng daily timeline.

---

## 6. Plugin settings

Plugin cần có phần Settings để người dùng thiết lập path lưu trữ.

### 6.1. Settings schema

```ts
interface TimelinePluginSettings {
  timelineFolder: string;
  attachmentFolder: string;
  fileOrganization: "flat" | "year" | "year-month";
  defaultView: "today" | "last-opened";
  timeFormat: "12h" | "24h";
}
```

### 6.2. Default settings

```ts
const DEFAULT_SETTINGS: TimelinePluginSettings = {
  timelineFolder: "Timeline",
  attachmentFolder: "Timeline Attachments",
  fileOrganization: "year-month",
  defaultView: "today",
  timeFormat: "24h",
};
```

### 6.3. Ý nghĩa các setting

| Setting | Ý nghĩa |
|---|---|
| `timelineFolder` | Folder lưu các file timeline ngày |
| `attachmentFolder` | Folder lưu image/audio/file đính kèm |
| `fileOrganization` | Cách tổ chức file theo flat/year/year-month |
| `defaultView` | Mở view mặc định ở hôm nay hay lần cuối |
| `timeFormat` | Định dạng giờ 12h hoặc 24h |

### 6.4. File organization

```txt
flat:
Timeline/2026-05-20.md

year:
Timeline/2026/2026-05-20.md

year-month:
Timeline/2026/05/2026-05-20.md
```

Khuyến nghị mặc định:

```txt
year-month
```

Vì timeline về lâu dài sẽ có nhiều file, chia theo năm/tháng giúp vault gọn hơn.

---

## 7. Obsidian Properties/frontmatter

### 7.1. Vai trò của Properties

Obsidian Properties/frontmatter chỉ nên lưu metadata cấp file timeline ngày, không nên lưu toàn bộ entry trong properties.

Nên dùng Properties để:

- Nhận diện file timeline.
- Lưu ngày timeline.
- Lưu version schema.
- Lưu số lượng entry.
- Lưu thời điểm tạo/cập nhật.

### 7.2. File-level properties đề xuất

```yaml
---
type: timeline-day
date: 2026-05-20
timeline_version: 1
entry_count: 2
created_at: 2026-05-20T08:15:00+07:00
updated_at: 2026-05-20T10:42:00+07:00
---
```

### 7.3. TypeScript schema

```ts
interface TimelineDayProperties {
  type: "timeline-day";
  date: string;
  timeline_version: number;
  entry_count: number;
  created_at: string;
  updated_at: string;
}
```

### 7.4. Không nên lưu entry trong properties

Không nên làm như sau:

```yaml
entries:
  - id: abc
    time: 08:15
    text: ...
  - id: def
    time: 10:42
    text: ...
```

Lý do:

- Properties sẽ dài và khó đọc.
- Không phù hợp với image/audio/file embed.
- Dễ conflict khi sync.
- Người dùng khó sửa thủ công.
- UI Properties của Obsidian không phù hợp với dữ liệu nhiều block.

---

## 8. Format timeline entry bằng Comment JSON ẩn

### 8.1. Nguyên tắc

Mỗi timeline entry là một Markdown block có cấu trúc:

```md
## {{HH:mm}} {{title}} ^{{entryId}}

<!-- timeline-entry
{{json metadata}}
-->

{{markdown content}}
```

Trong đó:

- Heading dùng để người dùng dễ đọc.
- Block ID dùng để jump/edit chính xác.
- Comment JSON là metadata chuẩn cho plugin.
- Markdown content là nội dung chính user đọc/sửa.

### 8.2. Ví dụ entry đầy đủ

```md
## 08:15 Morning check-in ^tl-20260520-081500-a3f9

<!-- timeline-entry
{
  "schemaVersion": 1,
  "id": "tl-20260520-081500-a3f9",
  "type": "checkin",
  "title": "Morning check-in",
  "date": "2026-05-20",
  "time": "08:15",
  "createdAt": "2026-05-20T08:15:00+07:00",
  "updatedAt": "2026-05-20T08:15:00+07:00",
  "tags": ["health", "morning"],
  "mood": "good",
  "source": "manual",
  "attachments": [
    {
      "id": "att-20260520-081530-1",
      "type": "image",
      "path": "Timeline Attachments/2026/05/photo.png",
      "name": "photo.png",
      "mime": "image/png"
    }
  ]
}
-->

Hôm nay ngủ hơi ít nhưng tỉnh táo.

![[Timeline Attachments/2026/05/photo.png]]
```

### 8.3. File timeline hoàn chỉnh

```md
---
type: timeline-day
date: 2026-05-20
timeline_version: 1
entry_count: 2
created_at: 2026-05-20T08:15:00+07:00
updated_at: 2026-05-20T10:42:00+07:00
---

## 08:15 Morning check-in ^tl-20260520-081500-a3f9

<!-- timeline-entry
{
  "schemaVersion": 1,
  "id": "tl-20260520-081500-a3f9",
  "type": "checkin",
  "title": "Morning check-in",
  "date": "2026-05-20",
  "time": "08:15",
  "createdAt": "2026-05-20T08:15:00+07:00",
  "updatedAt": "2026-05-20T08:15:00+07:00",
  "tags": ["health", "morning"],
  "mood": "good",
  "source": "manual",
  "attachments": []
}
-->

Hôm nay ngủ hơi ít nhưng tỉnh táo.

## 10:42 Meeting note ^tl-20260520-104200-b71c

<!-- timeline-entry
{
  "schemaVersion": 1,
  "id": "tl-20260520-104200-b71c",
  "type": "note",
  "title": "Meeting note",
  "date": "2026-05-20",
  "time": "10:42",
  "createdAt": "2026-05-20T10:42:00+07:00",
  "updatedAt": "2026-05-20T10:42:00+07:00",
  "tags": ["work", "meeting"],
  "mood": null,
  "source": "manual",
  "attachments": [
    {
      "id": "att-20260520-104210-1",
      "type": "audio",
      "path": "Timeline Attachments/2026/05/audio.webm",
      "name": "audio.webm",
      "mime": "audio/webm"
    }
  ]
}
-->

Trao đổi với team về plugin Obsidian.

![[Timeline Attachments/2026/05/audio.webm]]
```

---

## 9. Timeline entry schema

### 9.1. Entry type

```ts
export type TimelineEntryType =
  | "checkin"
  | "note"
  | "image"
  | "audio"
  | "file"
  | "mixed";
```

### 9.2. Entry source

```ts
export type TimelineEntrySource =
  | "manual"
  | "quick-capture"
  | "imported";
```

### 9.3. Attachment type

```ts
export type TimelineAttachmentType =
  | "image"
  | "audio"
  | "file";
```

### 9.4. Attachment schema

```ts
export interface TimelineAttachment {
  id: string;
  type: TimelineAttachmentType;
  path: string;
  name?: string;
  mime?: string;
  size?: number;
  createdAt?: string;
}
```

### 9.5. Entry metadata schema

```ts
export interface TimelineEntryMeta {
  schemaVersion: 1;
  id: string;
  type: TimelineEntryType;
  title?: string;
  date: string;
  time: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  mood?: string | null;
  source: TimelineEntrySource;
  attachments: TimelineAttachment[];
}
```

---

## 10. Attachment handling

### 10.1. Nguyên tắc

Không lưu image/audio/file dưới dạng base64 trong Markdown hoặc JSON. Attachment phải là file thật trong vault.

Khi user thêm attachment:

```txt
1. Plugin copy hoặc tạo file vào attachment folder.
2. Plugin tạo attachment metadata trong JSON.
3. Plugin chèn wikilink/embed vào Markdown body.
4. Plugin cập nhật index.
```

### 10.2. Đường dẫn attachment

```txt
Timeline Attachments/YYYY/MM/filename
```

Ví dụ:

```txt
Timeline Attachments/2026/05/2026-05-20_081530_audio.webm
```

### 10.3. Image

Image nên được embed bằng wikilink:

```md
![[Timeline Attachments/2026/05/photo.png]]
```

### 10.4. Audio

Audio nên được lưu thành file `.webm`, `.m4a`, hoặc định dạng phù hợp với khả năng platform.

Ví dụ:

```md
![[Timeline Attachments/2026/05/audio.webm]]
```

### 10.5. File attachment

File thông thường có thể dùng wikilink:

```md
[[Timeline Attachments/2026/05/document.pdf]]
```

---

## 11. Tạo file và folder

### 11.1. Tạo nested folder

Plugin cần tự tạo folder nếu chưa tồn tại.

```ts
import { App, normalizePath } from "obsidian";

async function ensureNestedFolder(app: App, folderPath: string) {
  const parts = normalizePath(folderPath).split("/");
  let current = "";

  for (const part of parts) {
    current = current ? `${current}/${part}` : part;

    if (!app.vault.getAbstractFileByPath(current)) {
      await app.vault.createFolder(current);
    }
  }
}
```

### 11.2. Tạo path file timeline

```ts
function getTimelineFilePath(
  settings: TimelinePluginSettings,
  date: string
) {
  const year = date.slice(0, 4);
  const month = date.slice(5, 7);

  if (settings.fileOrganization === "flat") {
    return normalizePath(`${settings.timelineFolder}/${date}.md`);
  }

  if (settings.fileOrganization === "year") {
    return normalizePath(`${settings.timelineFolder}/${year}/${date}.md`);
  }

  return normalizePath(`${settings.timelineFolder}/${year}/${month}/${date}.md`);
}
```

### 11.3. Tạo path attachment

```ts
function getAttachmentPath(
  settings: TimelinePluginSettings,
  date: string,
  filename: string
) {
  const year = date.slice(0, 4);
  const month = date.slice(5, 7);

  return normalizePath(
    `${settings.attachmentFolder}/${year}/${month}/${filename}`
  );
}
```

---

## 12. Tạo nội dung Markdown

### 12.1. Tạo file timeline ngày

```ts
function createTimelineDayTemplate(date: string, nowIso: string) {
  return `---
type: timeline-day
date: ${date}
timeline_version: 1
entry_count: 0
created_at: ${nowIso}
updated_at: ${nowIso}
---

`;
}
```

### 12.2. Tạo block entry

```ts
function createTimelineEntryBlock(
  meta: TimelineEntryMeta,
  markdownContent: string
): string {
  const title = meta.title ? ` ${meta.title}` : "";
  const json = JSON.stringify(meta, null, 2);

  return [
    `## ${meta.time}${title} ^${meta.id}`,
    "",
    "<!-- timeline-entry",
    json,
    "-->",
    "",
    markdownContent.trim(),
    "",
  ].join("\n");
}
```

---

## 13. Parse JSON ẩn trong block

### 13.1. Regex tìm timeline entry comment

```ts
const TIMELINE_ENTRY_REGEX =
  /<!--\s*timeline-entry\s*([\s\S]*?)\s*-->/g;
```

### 13.2. Parse metadata

```ts
export function parseTimelineEntryMetas(markdown: string): TimelineEntryMeta[] {
  const entries: TimelineEntryMeta[] = [];
  let match: RegExpExecArray | null;

  while ((match = TIMELINE_ENTRY_REGEX.exec(markdown)) !== null) {
    const rawJson = match[1].trim();

    try {
      const meta = JSON.parse(rawJson) as TimelineEntryMeta;

      if (isValidTimelineEntryMeta(meta)) {
        entries.push(meta);
      }
    } catch {
      // Không làm crash plugin nếu JSON bị hỏng.
    }
  }

  return entries;
}
```

### 13.3. Validate metadata

```ts
function isValidTimelineEntryMeta(value: unknown): value is TimelineEntryMeta {
  if (!value || typeof value !== "object") return false;

  const entry = value as Partial<TimelineEntryMeta>;

  return (
    entry.schemaVersion === 1 &&
    typeof entry.id === "string" &&
    typeof entry.date === "string" &&
    typeof entry.time === "string" &&
    typeof entry.createdAt === "string" &&
    typeof entry.updatedAt === "string" &&
    Array.isArray(entry.tags) &&
    Array.isArray(entry.attachments)
  );
}
```

---

## 14. Parse cả block content

Để edit/delete entry, plugin cần biết vị trí bắt đầu và kết thúc của từng block trong file.

```ts
export interface ParsedTimelineEntry {
  meta: TimelineEntryMeta;
  markdown: string;
  blockStart: number;
  blockEnd: number;
}
```

```ts
export function parseTimelineEntries(markdown: string): ParsedTimelineEntry[] {
  const headingRegex = /^##\s+.*?\s+\^(tl-[A-Za-z0-9_-]+)\s*$/gm;
  const headings: Array<{ id: string; start: number; end: number }> = [];

  let headingMatch: RegExpExecArray | null;

  while ((headingMatch = headingRegex.exec(markdown)) !== null) {
    headings.push({
      id: headingMatch[1],
      start: headingMatch.index,
      end: headingRegex.lastIndex,
    });
  }

  const result: ParsedTimelineEntry[] = [];

  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    const next = headings[i + 1];

    const blockStart = current.start;
    const blockEnd = next ? next.start : markdown.length;
    const blockMarkdown = markdown.slice(blockStart, blockEnd);

    const jsonMatch = /<!--\s*timeline-entry\s*([\s\S]*?)\s*-->/.exec(blockMarkdown);
    if (!jsonMatch) continue;

    try {
      const meta = JSON.parse(jsonMatch[1].trim()) as TimelineEntryMeta;

      if (isValidTimelineEntryMeta(meta) && meta.id === current.id) {
        result.push({
          meta,
          markdown: blockMarkdown,
          blockStart,
          blockEnd,
        });
      }
    } catch {
      // Ignore invalid entry.
    }
  }

  return result;
}
```

---

## 15. Update entry

### 15.1. Update metadata trong block

```ts
export function updateEntryMetaInBlock(
  blockMarkdown: string,
  nextMeta: TimelineEntryMeta
): string {
  const nextJson = JSON.stringify(nextMeta, null, 2);

  return blockMarkdown.replace(
    /<!--\s*timeline-entry\s*[\s\S]*?\s*-->/,
    ["<!-- timeline-entry", nextJson, "-->"].join("\n")
  );
}
```

### 15.2. Replace toàn bộ entry block

```ts
export function replaceEntryBlock(
  fileMarkdown: string,
  entryId: string,
  nextBlockMarkdown: string
): string {
  const entries = parseTimelineEntries(fileMarkdown);
  const target = entries.find((entry) => entry.meta.id === entryId);

  if (!target) {
    throw new Error(`Timeline entry not found: ${entryId}`);
  }

  return (
    fileMarkdown.slice(0, target.blockStart) +
    nextBlockMarkdown.trimEnd() +
    "\n\n" +
    fileMarkdown.slice(target.blockEnd).trimStart()
  );
}
```

---

## 16. Index/search/filter

### 16.1. Vì sao cần index

Không nên đọc và parse toàn bộ vault mỗi lần user gõ search. Plugin nên build index trong memory khi load, sau đó cập nhật index khi file thay đổi.

### 16.2. Index item schema

```ts
export interface TimelineIndexItem {
  id: string;
  date: string;
  time: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  tags: string[];
  mood?: string | null;
  attachmentTypes: TimelineAttachmentType[];
  sourcePath: string;
  blockId: string;
  textPreview: string;
}
```

### 16.3. Filter pipeline

```txt
all entries
→ filter by date/day range
→ filter by tags
→ filter by time range
→ filter by attachment type
→ fuzzy search text/title
→ sort by createdAt
```

### 16.4. Filter nên hỗ trợ

```txt
- Text search: meeting, idea, ăn trưa
- Tag: #work, #health, #reflection
- Time range: 08:00-12:00
- Preset time: morning, afternoon, evening
- Attachment type: has:image, has:audio, has:file
- Date: today, yesterday, this week, custom range
```

---

## 17. Luồng tạo check-in

```txt
User nhập text / chọn file / ghi âm
→ Plugin tạo entry id
→ Plugin tạo attachment nếu có
→ Plugin xác định file ngày hiện tại
→ Nếu file chưa tồn tại thì tạo file
→ Append block entry vào file
→ Update frontmatter entry_count và updated_at
→ Update in-memory index
→ UI re-render
```

### 17.1. Entry ID

Quy tắc đề xuất:

```txt
tl-YYYYMMDD-HHmmss-random
```

Ví dụ:

```txt
tl-20260520-081500-a3f9
```

### 17.2. Attachment ID

Quy tắc đề xuất:

```txt
att-YYYYMMDD-HHmmss-index
```

Ví dụ:

```txt
att-20260520-081530-1
```

---

## 18. Luồng edit entry

```txt
User chọn edit trên timeline card
→ Plugin đọc file nguồn
→ Parse entries
→ Tìm entry theo id
→ Update heading nếu title/time đổi
→ Update JSON comment
→ Update markdown content nếu nội dung đổi
→ Ghi lại file
→ Update index
→ Re-render UI
```

Khi user sửa title hoặc time từ UI, cần cập nhật cả:

- Heading.
- JSON metadata.
- Sort order trong index.

---

## 19. Luồng delete entry

```txt
User chọn delete
→ Plugin confirm nếu cần
→ Plugin đọc file nguồn
→ Parse entries
→ Tìm block theo id
→ Remove block khỏi markdown
→ Update frontmatter entry_count và updated_at
→ Ghi lại file
→ Update index
→ Re-render UI
```

Không nên xóa attachment ngay lập tức nếu attachment có thể được dùng ở nơi khác. Có thể thêm chức năng cleanup orphan attachments ở giai đoạn sau.

---

## 20. Luồng jump to source

Mỗi timeline card nên có action `Open source`.

Luồng:

```txt
User bấm Open source
→ Plugin mở file Markdown nguồn
→ Scroll tới block id tương ứng nếu có thể
```

Block id giúp entry có thể được link tới bằng Obsidian link:

```md
[[2026-05-20#^tl-20260520-081500-a3f9]]
```

---

## 21. Data consistency rules

Plugin cần tuân thủ các quy tắc sau:

1. `meta.id` phải trùng với block id ở heading.
2. `meta.date` phải trùng với ngày của file timeline.
3. `meta.time` phải trùng với giờ hiển thị ở heading.
4. Attachment trong JSON nên có link tương ứng trong markdown body nếu cần hiển thị.
5. Nếu JSON hỏng, plugin không được crash.
6. Nếu entry thiếu JSON, có thể bỏ qua hoặc hiển thị warning.
7. Nếu user sửa markdown body thủ công, plugin không tự ghi đè nội dung.
8. Nếu user sửa heading thủ công làm lệch JSON, plugin nên ưu tiên JSON làm source of truth cho metadata.
9. Properties cấp file nên được cập nhật khi plugin thêm/sửa/xóa entry.
10. Plugin index chỉ là cache, không phải source of truth.

---

## 22. Source of truth

| Loại dữ liệu | Source of truth |
|---|---|
| Nội dung check-in | Markdown body |
| Entry metadata | Comment JSON ẩn |
| File/ngày timeline | Frontmatter properties |
| Attachment binary | File thật trong vault |
| Search/filter nhanh | In-memory index/cache |
| Plugin setting | `.obsidian/plugins/.../data.json` |

---

## 23. Không nên làm

Không nên:

- Lưu toàn bộ timeline trong một file JSON duy nhất.
- Lưu image/audio/file bằng base64.
- Lưu toàn bộ entries trong Obsidian Properties.
- Scan toàn vault mỗi lần search.
- Làm UI phụ thuộc quá chặt vào cấu trúc HTML rendered.
- Xóa attachment tự động khi delete entry mà không kiểm tra orphan.
- Làm plugin crash khi JSON comment bị hỏng.

---

## 24. Roadmap phát triển

### Phase 1 — MVP text timeline

Mục tiêu: có thể dùng được với text check-in.

Chức năng:

- Plugin skeleton TypeScript.
- Register custom right sidebar view.
- Settings cho timeline folder và attachment folder.
- Tạo daily timeline file.
- Tạo check-in text.
- Lưu entry bằng hidden JSON comment.
- Hiển thị timeline hôm nay.
- Open source entry.

### Phase 2 — Filter/search

Chức năng:

- Parse toàn bộ timeline files trong folder.
- Build in-memory index.
- Search text/title.
- Filter theo tag.
- Filter theo time range.
- Date picker.
- Today/yesterday/this week.

### Phase 3 — Attachment

Chức năng:

- Image upload/paste.
- File attachment.
- Audio recording.
- Attachment preview trong timeline card.
- Attachment metadata trong JSON.

### Phase 4 — Edit/delete mạnh hơn

Chức năng:

- Edit entry từ UI.
- Delete entry.
- Duplicate entry.
- Update frontmatter tự động.
- Detect broken JSON.
- Recover hoặc warning entry lỗi.

### Phase 5 — Performance và UX

Chức năng:

- Debounced search.
- Virtualized timeline list.
- Watch vault changes.
- Cache parsed result.
- Mobile optimization.
- Daily summary.
- Calendar/heatmap view.
- Export week/month.

---

## 25. Cấu trúc code đề xuất

```txt
src/
  main.ts
  settings/
    settings.ts
    SettingsTab.ts
  views/
    TimelineView.ts
    TimelineToolbar.ts
    CheckInComposer.ts
    TimelineList.ts
    TimelineCard.ts
  storage/
    timelinePaths.ts
    timelineFile.ts
    frontmatter.ts
    attachments.ts
  parser/
    parseTimelineEntries.ts
    validateTimelineEntry.ts
  index/
    TimelineIndex.ts
    searchTimeline.ts
    filterTimeline.ts
  models/
    TimelineEntry.ts
    TimelineAttachment.ts
    TimelineSettings.ts
  utils/
    date.ts
    id.ts
    markdown.ts
```

---

## 26. Minimum viable data model

Nếu muốn làm MVP thật gọn, chỉ cần schema này trước:

```ts
interface TimelineEntryMeta {
  schemaVersion: 1;
  id: string;
  type: "checkin" | "note" | "mixed";
  title?: string;
  date: string;
  time: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  source: "manual" | "quick-capture" | "imported";
  attachments: TimelineAttachment[];
}

interface TimelineAttachment {
  id: string;
  type: "image" | "audio" | "file";
  path: string;
  name?: string;
  mime?: string;
}
```

Có thể thêm sau:

- mood
- energy
- location
- weather
- duration
- custom fields

---

## 27. Quyết định kỹ thuật cuối cùng

Các quyết định hiện tại của plugin:

```txt
UI:
- Custom ItemView ở right sidebar.

Storage:
- Mỗi ngày là một Markdown file.
- Attachment là file thật trong vault.
- Plugin settings nằm trong data.json.

Metadata:
- Properties/frontmatter cho file-level metadata.
- Comment JSON ẩn cho entry-level metadata.

Search/filter:
- Build in-memory index từ JSON comment + Markdown block preview.

File organization:
- Cho phép user thiết lập path trong plugin settings.
- Mặc định dùng year-month.

Entry identity:
- Dùng block id dạng ^tl-YYYYMMDD-HHmmss-random.
```

---

## 28. Tóm tắt thiết kế

Plugin này nên được phát triển như một lớp UI và workflow cá nhân nằm trên dữ liệu Markdown chuẩn của Obsidian.

Cách lưu tối ưu là:

```txt
Daily Markdown file
→ có Properties cấp ngày
→ chứa nhiều heading timeline entry
→ mỗi entry có block id
→ mỗi entry có hidden JSON comment
→ nội dung chính là Markdown thường
→ attachment là file thật trong vault
```

Format cốt lõi:

```md
## {{HH:mm}} {{title}} ^{{entryId}}

<!-- timeline-entry
{
  "schemaVersion": 1,
  "id": "{{entryId}}",
  "type": "checkin",
  "title": "{{title}}",
  "date": "{{YYYY-MM-DD}}",
  "time": "{{HH:mm}}",
  "createdAt": "{{ISO}}",
  "updatedAt": "{{ISO}}",
  "tags": [],
  "source": "manual",
  "attachments": []
}
-->

{{markdown content}}
```

Đây là hướng phát triển cân bằng giữa:

- Dễ dùng trong UI.
- Bền vững về dữ liệu.
- Dễ parse cho plugin.
- Dễ mở rộng về sau.
- Không phá vỡ tinh thần Markdown/local-first của Obsidian.

