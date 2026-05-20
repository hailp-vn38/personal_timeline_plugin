# Hướng dẫn hiển thị Timeline JSON Metadata trong Markdown Reading View của Obsidian

## 1. Mục tiêu

Tài liệu này hướng dẫn cách thêm UI hiển thị metadata JSON ẩn trong block timeline khi người dùng mở file `.md` ở **Reading view / View mode** của Obsidian.

Ý tưởng chính:

```txt
Markdown file
→ Có hidden JSON comment trong mỗi timeline block
→ Obsidian render file ở Reading view
→ Plugin dùng MarkdownPostProcessor
→ Plugin đọc raw markdown
→ Parse JSON comment
→ Inject UI metadata vào dưới heading tương ứng
```

Ví dụ file Markdown gốc:

```md
## 22:57 Untitled check-in ^tl-20260520-225723-a3f9

<!-- timeline-entry
{
  "schemaVersion": 1,
  "id": "tl-20260520-225723-a3f9",
  "type": "checkin",
  "title": "Untitled check-in",
  "date": "2026-05-20",
  "time": "22:57:23",
  "createdAt": "2026-05-20T22:57:23+07:00",
  "updatedAt": "2026-05-20T22:57:23+07:00",
  "tags": ["work", "note"],
  "source": "manual",
  "attachments": []
}
-->

Nội dung check-in ở đây.
```

Trong Reading view, plugin có thể render thành:

```txt
22:57 Untitled check-in

Timeline metadata
id          tl-20260520-225723-a3f9
type        checkin
date        2026-05-20
time        22:57:23
tags        work, note
attachments 0

Nội dung check-in ở đây.
```

---

## 2. Khác biệt với Timeline Sidebar View

Phần này **không phải** custom timeline sidebar.

Đây là UI được inject trực tiếp vào file Markdown khi mở note ở Reading view.

```txt
Timeline sidebar view:
- UI riêng của plugin
- Render entries từ index/cache
- Có filter/search/composer

Markdown Reading view:
- UI nằm trong file .md đã render
- Dùng registerMarkdownPostProcessor
- Chỉ hiển thị metadata từ JSON comment trong note
```

---

## 3. API cần dùng

Trong plugin Obsidian, dùng:

```ts
this.registerMarkdownPostProcessor(...)
```

API này chạy sau khi Markdown đã được Obsidian render thành HTML ở Reading view.

Không nên tìm JSON trong `el.innerHTML`, vì HTML comment có thể đã bị loại bỏ khỏi DOM. Cách đúng là:

```txt
1. Lấy file path từ ctx.sourcePath
2. Đọc raw markdown bằng app.vault.read(file)
3. Parse JSON comment trong raw markdown
4. Tìm heading/block id tương ứng trong rendered DOM
5. Inject UI metadata vào DOM
```

---

## 4. Settings cần thêm

Thêm setting để bật/tắt tính năng hiển thị metadata trong Reading view.

### 4.1. Settings interface

```ts
interface TimelinePluginSettings {
  timelineFolder: string;
  attachmentFolder: string;
  fileOrganization: "flat" | "year" | "year-month";

  showMetadataInReadingView: boolean;
  metadataReadingViewMode: "summary" | "table" | "json";
}
```

### 4.2. Default settings

```ts
const DEFAULT_SETTINGS: TimelinePluginSettings = {
  timelineFolder: "Timeline",
  attachmentFolder: "Timeline Attachments",
  fileOrganization: "year-month",

  showMetadataInReadingView: true,
  metadataReadingViewMode: "summary",
};
```

### 4.3. Setting tab UI

```ts
import { Setting } from "obsidian";

new Setting(containerEl)
  .setName("Show timeline metadata in Reading view")
  .setDesc("Render hidden timeline JSON metadata inside Markdown reading view.")
  .addToggle((toggle) =>
    toggle
      .setValue(this.plugin.settings.showMetadataInReadingView)
      .onChange(async (value) => {
        this.plugin.settings.showMetadataInReadingView = value;
        await this.plugin.saveSettings();
      })
  );

new Setting(containerEl)
  .setName("Metadata Reading view mode")
  .setDesc("Choose how metadata is displayed in Markdown Reading view.")
  .addDropdown((dropdown) =>
    dropdown
      .addOption("summary", "Summary")
      .addOption("table", "Table")
      .addOption("json", "Raw JSON")
      .setValue(this.plugin.settings.metadataReadingViewMode)
      .onChange(async (value: "summary" | "table" | "json") => {
        this.plugin.settings.metadataReadingViewMode = value;
        await this.plugin.saveSettings();
      })
  );
```

---

## 5. Đăng ký MarkdownPostProcessor

Trong `main.ts`, đăng ký processor trong `onload()`.

```ts
import {
  MarkdownPostProcessorContext,
  Plugin,
  TFile,
} from "obsidian";

export default class PersonalTimelinePlugin extends Plugin {
  settings: TimelinePluginSettings;

  async onload() {
    await this.loadSettings();

    this.registerMarkdownPostProcessor(async (el, ctx) => {
      if (!this.settings.showMetadataInReadingView) return;

      await this.renderTimelineMetadataInReadingView(el, ctx);
    });
  }

  async renderTimelineMetadataInReadingView(
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) {
    const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);

    if (!(file instanceof TFile)) return;
    if (file.extension !== "md") return;

    const markdown = await this.app.vault.read(file);

    const entries = parseTimelineEntries(markdown);
    if (!entries.length) return;

    injectTimelineMetadataUi(
      el,
      entries,
      this.settings.metadataReadingViewMode
    );
  }
}
```

---

## 6. Timeline metadata schema

Ví dụ schema metadata đã lưu trong comment JSON.

```ts
export type TimelineEntryType =
  | "checkin"
  | "note"
  | "image"
  | "audio"
  | "file"
  | "mixed";

export type TimelineEntrySource =
  | "manual"
  | "quick-capture"
  | "imported";

export interface TimelineAttachment {
  id: string;
  type: "image" | "audio" | "file";
  path: string;
  name?: string;
  mime?: string;
  size?: number;
  createdAt?: string;
}

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

## 7. Parse hidden JSON comment

### 7.1. Parsed entry type

```ts
export interface ParsedTimelineEntry {
  meta: TimelineEntryMeta;
  markdown: string;
  blockStart: number;
  blockEnd: number;
}
```

### 7.2. Validate metadata

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

### 7.3. Parse entries theo heading block

```ts
const TIMELINE_ENTRY_COMMENT_REGEX =
  /<!--\s*timeline-entry\s*([\s\S]*?)\s*-->/;

export function parseTimelineEntries(markdown: string): ParsedTimelineEntry[] {
  const headingRegex = /^##\s+.*?\s+\^(tl-[A-Za-z0-9_-]+)\s*$/gm;

  const headings: Array<{
    id: string;
    start: number;
    end: number;
  }> = [];

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

    const jsonMatch = TIMELINE_ENTRY_COMMENT_REGEX.exec(blockMarkdown);
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
      // Không làm crash plugin nếu JSON bị hỏng.
    }
  }

  return result;
}
```

---

## 8. Tìm heading/block đã render trong Reading view

Sau khi có `meta.id`, cần tìm vị trí tương ứng trong DOM để inject UI.

### 8.1. Tìm theo block id

```ts
function findRenderedBlockElement(
  rootEl: HTMLElement,
  blockId: string
): HTMLElement | null {
  const escapedId = CSS.escape(blockId);

  const anchor =
    rootEl.querySelector(`[href$="#^${escapedId}"]`) ||
    rootEl.querySelector(`[data-href$="#^${escapedId}"]`) ||
    rootEl.querySelector(`[id="${escapedId}"]`);

  if (anchor) {
    return anchor.closest("h1,h2,h3,h4,h5,h6") as HTMLElement | null;
  }

  return null;
}
```

### 8.2. Fallback tìm theo heading text

```ts
function findHeadingByEntryMeta(
  rootEl: HTMLElement,
  meta: TimelineEntryMeta
): HTMLElement | null {
  const headings = Array.from(
    rootEl.querySelectorAll("h1,h2,h3,h4,h5,h6")
  ) as HTMLElement[];

  return (
    headings.find((heading) => {
      const text = heading.textContent ?? "";
      return text.includes(meta.time) && text.includes(meta.title ?? "");
    }) ?? null
  );
}
```

---

## 9. Inject metadata UI vào Reading view

```ts
function injectTimelineMetadataUi(
  rootEl: HTMLElement,
  entries: ParsedTimelineEntry[],
  mode: "summary" | "table" | "json"
) {
  for (const entry of entries) {
    const headingEl =
      findRenderedBlockElement(rootEl, entry.meta.id) ||
      findHeadingByEntryMeta(rootEl, entry.meta);

    if (!headingEl) continue;

    const alreadyRendered = rootEl.querySelector(
      `.pt-reading-metadata[data-entry-id="${entry.meta.id}"]`
    );

    if (alreadyRendered) continue;

    const metadataEl = createReadingMetadataElement(entry.meta, mode);

    headingEl.insertAdjacentElement("afterend", metadataEl);
  }
}
```

---

## 10. Tạo metadata element

```ts
function createReadingMetadataElement(
  meta: TimelineEntryMeta,
  mode: "summary" | "table" | "json"
) {
  const container = document.createElement("div");
  container.className = "pt-reading-metadata";
  container.dataset.entryId = meta.id;

  if (mode === "summary") {
    renderMetadataSummary(container, meta);
  }

  if (mode === "table") {
    renderMetadataTable(container, meta);
  }

  if (mode === "json") {
    renderMetadataJson(container, meta);
  }

  return container;
}
```

---

## 11. Render summary mode

Summary mode là chế độ khuyến nghị mặc định vì gọn và không phá flow đọc note.

```ts
function renderMetadataSummary(
  container: HTMLElement,
  meta: TimelineEntryMeta
) {
  const summary = [
    meta.type,
    meta.date,
    meta.time,
    `${meta.tags.length} tags`,
    `${meta.attachments.length} attachments`,
  ].join(" · ");

  container.createDiv({
    cls: "pt-reading-metadata-summary",
    text: summary,
  });
}
```

Kết quả:

```txt
checkin · 2026-05-20 · 22:57:23 · 2 tags · 0 attachments
```

---

## 12. Render table mode

Table mode phù hợp khi cần xem rõ từng field.

```ts
function renderMetadataTable(
  container: HTMLElement,
  meta: TimelineEntryMeta
) {
  const headerEl = container.createDiv({
    cls: "pt-reading-metadata-header",
  });

  headerEl.createSpan({
    cls: "pt-reading-metadata-title",
    text: "Timeline metadata",
  });

  const copyButton = headerEl.createEl("button", {
    cls: "pt-reading-metadata-copy",
    text: "Copy JSON",
  });

  copyButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    await navigator.clipboard.writeText(JSON.stringify(meta, null, 2));
  });

  const tableEl = container.createDiv({
    cls: "pt-reading-metadata-table",
  });

  renderMetadataRow(tableEl, "id", meta.id);
  renderMetadataRow(tableEl, "type", meta.type);
  renderMetadataRow(tableEl, "title", meta.title ?? "");
  renderMetadataRow(tableEl, "date", meta.date);
  renderMetadataRow(tableEl, "time", meta.time);
  renderMetadataRow(tableEl, "createdAt", meta.createdAt);
  renderMetadataRow(tableEl, "updatedAt", meta.updatedAt);
  renderMetadataRow(tableEl, "tags", meta.tags.join(", "));
  renderMetadataRow(tableEl, "source", meta.source);
  renderMetadataRow(tableEl, "attachments", String(meta.attachments.length));
}

function renderMetadataRow(
  container: HTMLElement,
  key: string,
  value: string
) {
  const rowEl = container.createDiv({
    cls: "pt-reading-metadata-row",
  });

  rowEl.createDiv({
    cls: "pt-reading-metadata-key",
    text: key,
  });

  rowEl.createDiv({
    cls: "pt-reading-metadata-value",
    text: value || "—",
  });
}
```

---

## 13. Render raw JSON mode

Raw JSON mode phù hợp cho debug.

```ts
function renderMetadataJson(
  container: HTMLElement,
  meta: TimelineEntryMeta
) {
  const headerEl = container.createDiv({
    cls: "pt-reading-metadata-header",
  });

  headerEl.createSpan({
    cls: "pt-reading-metadata-title",
    text: "Timeline metadata JSON",
  });

  const copyButton = headerEl.createEl("button", {
    cls: "pt-reading-metadata-copy",
    text: "Copy JSON",
  });

  copyButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    await navigator.clipboard.writeText(JSON.stringify(meta, null, 2));
  });

  const preEl = container.createEl("pre", {
    cls: "pt-reading-metadata-json",
  });

  const codeEl = preEl.createEl("code");
  codeEl.setText(JSON.stringify(meta, null, 2));
}
```

---

## 14. CSS cho Reading view metadata

Thêm vào `styles.css`.

```css
.pt-reading-metadata {
  margin: 8px 0 12px;
  padding: 8px 10px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  background: var(--background-secondary);
  font-size: 0.85em;
}

.pt-reading-metadata-summary {
  color: var(--text-muted);
  font-family: var(--font-monospace);
}

.pt-reading-metadata-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.pt-reading-metadata-title {
  color: var(--text-muted);
  font-weight: 600;
}

.pt-reading-metadata-copy {
  font-size: 0.8em;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--interactive-normal);
  color: var(--text-normal);
  border: 1px solid var(--background-modifier-border);
  cursor: pointer;
}

.pt-reading-metadata-copy:hover {
  background: var(--interactive-hover);
}

.pt-reading-metadata-table {
  display: grid;
  gap: 4px;
}

.pt-reading-metadata-row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 8px;
}

.pt-reading-metadata-key {
  color: var(--text-muted);
  font-family: var(--font-monospace);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pt-reading-metadata-value {
  color: var(--text-normal);
  font-family: var(--font-monospace);
  overflow-wrap: anywhere;
}

.pt-reading-metadata-json {
  margin: 0;
  padding: 8px;
  max-height: 260px;
  overflow: auto;
  border-radius: 8px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  color: var(--text-normal);
  font-family: var(--font-monospace);
  font-size: 0.8em;
}
```

---

## 15. Chỉ xử lý timeline notes

Để tránh plugin inject UI vào mọi file Markdown, nên kiểm tra file có phải timeline file hay không.

Có 2 cách.

### Cách 1: kiểm tra path

```ts
function isTimelineFile(path: string, settings: TimelinePluginSettings) {
  return path.startsWith(settings.timelineFolder + "/");
}
```

Dùng trong processor:

```ts
if (!isTimelineFile(ctx.sourcePath, this.settings)) return;
```

### Cách 2: kiểm tra frontmatter

Nếu file có frontmatter:

```yaml
---
type: timeline-day
date: 2026-05-20
timeline_version: 1
---
```

Có thể kiểm tra từ raw markdown:

```ts
function isTimelineMarkdown(markdown: string) {
  return /^---[\s\S]*?type:\s*timeline-day[\s\S]*?---/.test(markdown);
}
```

Dùng:

```ts
const markdown = await this.app.vault.read(file);

if (!isTimelineMarkdown(markdown)) return;
```

Khuyến nghị dùng cả hai:

```ts
if (!isTimelineFile(ctx.sourcePath, this.settings)) return;

const markdown = await this.app.vault.read(file);

if (!isTimelineMarkdown(markdown)) return;
```

---

## 16. Reading view và Live Preview

Cách trong tài liệu này chỉ áp dụng cho:

```txt
Reading view / View mode
```

Không áp dụng cho:

```txt
Live Preview
Source mode
```

Nếu muốn hiện metadata trong Live Preview, cần dùng CodeMirror extension/decorations thông qua:

```ts
this.registerEditorExtension(...)
```

Khuyến nghị chia phase:

```txt
Phase 1:
- Hiển thị metadata trong Reading view bằng MarkdownPostProcessor

Phase 2:
- Hiển thị metadata trong Live Preview bằng CodeMirror decorations

Phase 3:
- Cho edit metadata bằng form an toàn
```

---

## 17. Có nên cho sửa JSON trực tiếp không?

Không nên cho sửa raw JSON trực tiếp trong Reading view ở phiên bản đầu.

Nên hỗ trợ:

```txt
- View metadata
- Copy JSON
- Switch summary/table/json mode trong settings
```

Không nên hỗ trợ ngay:

```txt
- Edit raw JSON trực tiếp
```

Lý do:

```txt
- User có thể làm hỏng JSON syntax
- Mất id
- Lệch block id
- Sai date/time
- Sai attachment path
- Làm parser không đọc được entry
```

Nếu sau này cần edit metadata, nên dùng form:

```txt
Title
Type
Tags
Mood
Source
Attachments
```

Sau đó plugin tự generate lại JSON.

---

## 18. Thứ tự triển khai khuyến nghị

```txt
1. Thêm settings:
   - showMetadataInReadingView
   - metadataReadingViewMode

2. Thêm parser:
   - parseTimelineEntries()
   - isValidTimelineEntryMeta()

3. Đăng ký registerMarkdownPostProcessor()

4. Đọc raw markdown từ ctx.sourcePath

5. Lọc đúng timeline file

6. Parse entries từ hidden JSON comment

7. Tìm heading/block id trong rendered DOM

8. Inject metadata UI

9. Thêm CSS cho metadata UI

10. Test với các mode:
    - summary
    - table
    - json
```

---

## 19. Checklist triển khai

### Settings

- [ ] Thêm `showMetadataInReadingView`.
- [ ] Thêm `metadataReadingViewMode`.
- [ ] Thêm toggle trong settings tab.
- [ ] Thêm dropdown chọn `summary`, `table`, `json`.

### Parser

- [ ] Parse heading chứa block id.
- [ ] Parse `<!-- timeline-entry ... -->`.
- [ ] Validate JSON.
- [ ] Không crash khi JSON lỗi.
- [ ] Bỏ qua entry không hợp lệ.

### Reading view processor

- [ ] Đăng ký `registerMarkdownPostProcessor`.
- [ ] Đọc file từ `ctx.sourcePath`.
- [ ] Chỉ xử lý file `.md`.
- [ ] Chỉ xử lý timeline file.
- [ ] Inject UI sau heading.
- [ ] Tránh inject duplicate.

### UI modes

- [ ] Summary mode.
- [ ] Table mode.
- [ ] Raw JSON mode.
- [ ] Copy JSON button.

### CSS

- [ ] Dùng `var(--text-normal)`.
- [ ] Dùng `var(--text-muted)`.
- [ ] Dùng `var(--background-secondary)`.
- [ ] Dùng `var(--background-modifier-border)`.
- [ ] Dùng `var(--font-monospace)`.
- [ ] Không hard-code màu chính.

### Testing

- [ ] File có 1 entry.
- [ ] File có nhiều entry.
- [ ] Entry không có tags.
- [ ] Entry có attachments.
- [ ] Entry có JSON lỗi.
- [ ] File không phải timeline.
- [ ] Reading view reload không bị duplicate UI.
- [ ] Copy JSON hoạt động.

---

## 20. Kết quả cuối cùng

Sau khi triển khai, file Markdown vẫn giữ nguyên dạng local-first:

```md
## 22:57 Untitled check-in ^tl-20260520-225723-a3f9

<!-- timeline-entry
{
  "schemaVersion": 1,
  "id": "tl-20260520-225723-a3f9",
  "type": "checkin",
  "title": "Untitled check-in",
  "date": "2026-05-20",
  "time": "22:57:23",
  "createdAt": "2026-05-20T22:57:23+07:00",
  "updatedAt": "2026-05-20T22:57:23+07:00",
  "tags": ["work", "note"],
  "source": "manual",
  "attachments": []
}
-->

Nội dung check-in ở đây.
```

Nhưng khi mở ở Reading view, người dùng thấy UI metadata rõ ràng:

```txt
Timeline metadata
checkin · 2026-05-20 · 22:57:23 · 2 tags · 0 attachments
```

Hoặc table/json tùy setting.

---

## 21. Kết luận

Để hiển thị JSON metadata trong file Markdown ở chế độ View/Reading mode:

```txt
Dùng registerMarkdownPostProcessor
→ Đọc raw markdown bằng ctx.sourcePath
→ Parse hidden JSON comments
→ Tìm heading/block id đã render
→ Inject UI metadata vào DOM
```

Thiết kế này giữ nguyên format lưu trữ, không làm lộ JSON comment trong source, nhưng vẫn cho phép người dùng xem metadata trực quan khi đọc note.
