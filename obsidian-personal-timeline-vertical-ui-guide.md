# Hướng dẫn triển khai UI Vertical Timeline cho Obsidian Personal Timeline Plugin

## 1. Mục tiêu

Tài liệu này hướng dẫn triển khai giao diện timeline theo dạng **vertical timeline rail** giống hình minh họa:

```txt
23/6/2026

●  22:57:23
│
│
●  06:30:06
│
│
●
```

UI mới sẽ thay thế dạng card list truyền thống bằng một dòng thời gian dọc, trong đó mỗi entry là một mốc thời gian có dot, line nối, thời gian, nội dung, attachment và menu thao tác.

---

## 2. Kết quả mong muốn

Giao diện sau khi triển khai nên có dạng:

```txt
Personal timeline                 Today

[Quick check-in...                    +]

[Search text, title, tags...           ]
[Today ▾] [Tags ▾] [Time ▾]

23/6/2026

●  22:57:23  Untitled check-in       ⋯
│            Timeline
│            📎 2 attachments · 🎙 audio
│
●  06:30:06  Morning note            ⋯
│            Content preview
│            #work #note
│
●  00:12:44  Last note               ⋯
             Short content
```

Thiết kế cần đảm bảo:

- Timeline là nội dung trung tâm.
- UI gọn trong sidebar Obsidian.
- Dot và line tạo cảm giác dòng thời gian thật.
- Entry compact mặc định.
- Attachment/audio chỉ hiển thị chi tiết khi mở rộng.
- Action nằm trong menu ba chấm.
- Dùng CSS variables của Obsidian để hợp theme.

---

## 3. Cấu trúc component đề xuất

```txt
TimelineView
├── TimelineHeader
├── QuickCheckInComposer
├── TimelineFilter
└── TimelineList
    └── TimelineDayGroup
        └── TimelineEntry
            ├── TimelineRail
            │   ├── Dot
            │   └── Line
            └── EntryContent
                ├── EntryHeader
                ├── EntryBody
                ├── EntryTags
                ├── AttachmentSummary
                └── ExpandedAttachmentPreview
```

---

## 4. Cấu trúc HTML mong muốn

Mỗi ngày là một `day group`.

```html
<section class="pt-day-group">
  <div class="pt-day-header">23/6/2026</div>

  <div class="pt-timeline">
    <div class="pt-entry">
      <div class="pt-rail">
        <div class="pt-dot pt-dot-checkin"></div>
        <div class="pt-line"></div>
      </div>

      <div class="pt-entry-main">
        <div class="pt-entry-header">
          <span class="pt-entry-time">22:57:23</span>
          <span class="pt-entry-title">Untitled check-in</span>
          <button class="pt-entry-menu">⋯</button>
        </div>

        <div class="pt-entry-body">
          Timeline
        </div>

        <div class="pt-entry-attachments">
          📎 2 attachments · 🎙 1
        </div>
      </div>
    </div>
  </div>
</section>
```

---

## 5. CSS cơ bản cho Vertical Timeline

Tạo hoặc cập nhật file `styles.css`.

```css
.pt-day-group {
  margin-top: 12px;
}

.pt-day-header {
  margin: 8px 0 14px;
  padding-left: 8px;
  color: var(--text-normal);
  font-size: 1.15em;
  font-weight: 700;
}

.pt-timeline {
  position: relative;
}

.pt-entry {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  column-gap: 10px;
  position: relative;
}

.pt-rail {
  position: relative;
  display: flex;
  justify-content: center;
}

.pt-dot {
  width: 15px;
  height: 15px;
  margin-top: 4px;
  border-radius: 999px;
  background: var(--interactive-accent);
  border: 3px solid var(--background-primary);
  box-shadow: 0 0 0 2px var(--text-normal);
  z-index: 2;
}

.pt-line {
  position: absolute;
  top: 25px;
  bottom: 0;
  width: 2px;
  background: var(--background-modifier-border);
  z-index: 1;
}

.pt-entry:last-child .pt-line {
  display: none;
}

.pt-entry-main {
  min-width: 0;
  padding-bottom: 22px;
}

.pt-entry-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 24px;
  gap: 8px;
  align-items: baseline;
}

.pt-entry-time {
  color: var(--text-accent);
  font-size: 0.9em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pt-entry-title {
  color: var(--text-normal);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pt-entry-menu {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0 4px;
  opacity: 0.65;
}

.pt-entry-main:hover .pt-entry-menu {
  opacity: 1;
}

.pt-entry-body {
  margin-top: 4px;
  color: var(--text-normal);
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.pt-entry-tags {
  margin-top: 6px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.pt-tag {
  font-size: 0.78em;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--background-modifier-hover);
  color: var(--text-muted);
}

.pt-entry-attachments {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 0.85em;
}

.pt-attachment-name {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
```

---

## 6. CSS phiên bản giống sketch hơn

Nếu muốn dot lớn, line đậm như hình phác thảo:

```css
.pt-entry {
  grid-template-columns: 42px minmax(0, 1fr);
  column-gap: 12px;
}

.pt-dot {
  width: 22px;
  height: 22px;
  margin-top: 2px;
  border-radius: 50%;
  background: var(--interactive-accent);
  border: 4px solid var(--background-primary);
  box-shadow: 0 0 0 3px var(--text-normal);
}

.pt-line {
  top: 34px;
  width: 4px;
  border-radius: 999px;
  background: var(--text-normal);
  opacity: 0.85;
}

.pt-entry-main {
  padding-bottom: 48px;
}

.pt-entry-time {
  font-size: 1.15em;
  font-weight: 700;
}
```

Khuyến nghị: dùng bản cơ bản trước, sau đó tăng dot/line nếu muốn UI giống sketch hơn.

---

## 7. Màu dot theo loại entry

Có thể đổi màu dot theo `entry.type`.

```txt
checkin → accent
note    → blue
image   → green
audio   → yellow
file    → purple
mixed   → pink
```

CSS:

```css
.pt-dot-checkin {
  background: var(--interactive-accent);
}

.pt-dot-note {
  background: var(--color-blue, var(--interactive-accent));
}

.pt-dot-image {
  background: var(--color-green, var(--interactive-accent));
}

.pt-dot-audio {
  background: var(--color-yellow, var(--interactive-accent));
}

.pt-dot-file {
  background: var(--color-purple, var(--interactive-accent));
}

.pt-dot-mixed {
  background: var(--color-pink, var(--interactive-accent));
}
```

---

## 8. Cập nhật data model

Nếu `TimelineIndexItem` hiện tại chưa đủ dữ liệu để render timeline, cập nhật như sau:

```ts
export interface TimelineIndexItem {
  id: string;
  type: TimelineEntryType;
  date: string;
  time: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  tags: string[];
  attachmentTypes: TimelineAttachmentType[];
  attachments: TimelineAttachment[];
  sourcePath: string;
  blockId: string;
  textPreview: string;
}
```

Attachment:

```ts
export interface TimelineAttachment {
  id: string;
  type: "image" | "audio" | "file";
  path: string;
  name?: string;
  mime?: string;
  size?: number;
  createdAt?: string;
}
```

---

## 9. Group entries theo ngày

Trong `TimelineList`, trước khi render cần group entry theo `date`.

```ts
function groupEntriesByDate(entries: TimelineIndexItem[]) {
  const groups = new Map<string, TimelineIndexItem[]>();

  for (const entry of entries) {
    const list = groups.get(entry.date) ?? [];
    list.push(entry);
    groups.set(entry.date, list);
  }

  for (const list of groups.values()) {
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}
```

Render tổng:

```ts
function renderTimelineList(entries: TimelineIndexItem[]) {
  const groups = groupEntriesByDate(entries);

  for (const [date, dayEntries] of groups) {
    renderDayGroup(date, dayEntries);
  }
}
```

---

## 10. Format date header

Format date theo kiểu trong sketch: `23/6/2026`.

```ts
function formatDisplayDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${Number(day)}/${Number(month)}/${year}`;
}
```

Nếu muốn hiển thị `Today` cho ngày hiện tại:

```ts
function formatDayHeader(date: string) {
  const today = new Date();
  const todayString = today.toISOString().slice(0, 10);

  if (date === todayString) {
    return "Today";
  }

  return formatDisplayDate(date);
}
```

---

## 11. Render day group

```ts
function renderDayGroup(
  container: HTMLElement,
  date: string,
  entries: TimelineIndexItem[]
) {
  const groupEl = container.createDiv({ cls: "pt-day-group" });

  groupEl.createDiv({
    cls: "pt-day-header",
    text: formatDisplayDate(date),
  });

  const timelineEl = groupEl.createDiv({ cls: "pt-timeline" });

  for (const entry of entries) {
    renderTimelineEntry(timelineEl, entry);
  }
}
```

---

## 12. Render timeline entry

```ts
function renderTimelineEntry(
  container: HTMLElement,
  entry: TimelineIndexItem
) {
  const entryEl = container.createDiv({ cls: "pt-entry" });

  const railEl = entryEl.createDiv({ cls: "pt-rail" });

  railEl.createDiv({
    cls: `pt-dot pt-dot-${entry.type ?? "checkin"}`,
  });

  railEl.createDiv({ cls: "pt-line" });

  const mainEl = entryEl.createDiv({ cls: "pt-entry-main" });

  const headerEl = mainEl.createDiv({ cls: "pt-entry-header" });

  headerEl.createSpan({
    cls: "pt-entry-time",
    text: entry.time,
  });

  headerEl.createSpan({
    cls: "pt-entry-title",
    text: entry.title || "Untitled check-in",
  });

  const menuButton = headerEl.createEl("button", {
    cls: "pt-entry-menu",
    text: "⋯",
  });

  menuButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openEntryMenu(event, entry);
  });

  if (entry.textPreview) {
    mainEl.createDiv({
      cls: "pt-entry-body",
      text: entry.textPreview,
    });
  }

  renderEntryTags(mainEl, entry.tags);
  renderAttachmentSummary(mainEl, entry.attachments);
}
```

---

## 13. Render tags

```ts
function renderEntryTags(container: HTMLElement, tags: string[]) {
  if (!tags.length) return;

  const tagsEl = container.createDiv({ cls: "pt-entry-tags" });

  for (const tag of tags) {
    tagsEl.createSpan({
      cls: "pt-tag",
      text: tag.startsWith("#") ? tag : `#${tag}`,
    });
  }
}
```

---

## 14. Render attachment summary

Trong compact mode, chỉ nên hiển thị summary, không hiển thị full path.

```ts
function renderAttachmentSummary(
  container: HTMLElement,
  attachments: TimelineAttachment[]
) {
  if (!attachments.length) return;

  const imageCount = attachments.filter((a) => a.type === "image").length;
  const audioCount = attachments.filter((a) => a.type === "audio").length;
  const fileCount = attachments.filter((a) => a.type === "file").length;

  const parts: string[] = [];

  if (imageCount) parts.push(`🖼 ${imageCount}`);
  if (audioCount) parts.push(`🎙 ${audioCount}`);
  if (fileCount) parts.push(`📄 ${fileCount}`);

  const summary = parts.length
    ? `📎 ${attachments.length} attachments · ${parts.join(" · ")}`
    : `📎 ${attachments.length} attachments`;

  container.createDiv({
    cls: "pt-entry-attachments",
    text: summary,
  });
}
```

---

## 15. Compact và expanded mode

Entry nên mặc định ở compact mode.

Compact:

```txt
●  22:57:23  Untitled check-in
│            Timeline
│            📎 2 attachments
```

Expanded:

```txt
●  22:57:23  Untitled check-in
│            Timeline
│
│            🖼 image.png
│            🎙 recording.webm
│            [audio player]
```

State đề xuất:

```ts
interface TimelineViewState {
  expandedEntryIds: Set<string>;
}
```

Toggle:

```ts
function toggleEntryExpanded(entryId: string) {
  if (state.expandedEntryIds.has(entryId)) {
    state.expandedEntryIds.delete(entryId);
  } else {
    state.expandedEntryIds.add(entryId);
  }

  render();
}
```

Click entry để expand/collapse:

```ts
mainEl.addEventListener("click", () => {
  toggleEntryExpanded(entry.id);
});
```

---

## 16. Render expanded attachments

```ts
function renderExpandedAttachments(
  container: HTMLElement,
  attachments: TimelineAttachment[]
) {
  if (!attachments.length) return;

  const wrapEl = container.createDiv({ cls: "pt-expanded-attachments" });

  for (const attachment of attachments) {
    const itemEl = wrapEl.createDiv({ cls: "pt-expanded-attachment" });

    const filename = getBasename(attachment.path);

    itemEl.createSpan({
      cls: "pt-attachment-name",
      text: getAttachmentIcon(attachment.type) + " " + filename,
    }).setAttr("title", attachment.path);

    if (attachment.type === "audio") {
      const audioEl = itemEl.createEl("audio", {
        cls: "pt-audio-player",
      });

      audioEl.controls = true;
      audioEl.src = this.app.vault.adapter.getResourcePath(attachment.path);
    }
  }
}
```

Helper:

```ts
function getBasename(path: string) {
  return path.split("/").pop() ?? path;
}

function getAttachmentIcon(type: TimelineAttachment["type"]) {
  if (type === "image") return "🖼";
  if (type === "audio") return "🎙";
  return "📄";
}
```

> Lưu ý: `this.app.vault.adapter.getResourcePath(...)` cần được gọi trong context có `this.app`. Nếu helper nằm ngoài class, truyền `app` vào function.

---

## 17. Menu ba chấm cho entry

Dùng `Menu` của Obsidian.

```ts
import { Menu } from "obsidian";

function openEntryMenu(event: MouseEvent, entry: TimelineIndexItem) {
  const menu = new Menu();

  menu.addItem((item) =>
    item
      .setTitle("Edit")
      .setIcon("pencil")
      .onClick(() => editEntry(entry))
  );

  menu.addItem((item) =>
    item
      .setTitle("Duplicate")
      .setIcon("copy")
      .onClick(() => duplicateEntry(entry))
  );

  menu.addItem((item) =>
    item
      .setTitle("Open source")
      .setIcon("external-link")
      .onClick(() => openEntrySource(entry))
  );

  menu.addSeparator();

  menu.addItem((item) =>
    item
      .setTitle("Delete")
      .setIcon("trash")
      .onClick(() => deleteEntry(entry))
  );

  menu.showAtMouseEvent(event);
}
```

---

## 18. Bỏ card background hay giữ card?

Có 2 hướng.

### Option A: Timeline sạch, không card

```css
.pt-entry-main {
  padding: 2px 4px 24px 0;
  border-radius: 8px;
}

.pt-entry-main:hover {
  background: var(--background-modifier-hover);
}
```

Ưu điểm:

- Giống sketch hơn.
- Nhẹ hơn.
- Timeline rõ hơn.

### Option B: Timeline có subtle card

```css
.pt-entry-content-card {
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
}
```

Ưu điểm:

- Nội dung entry tách bạch hơn.
- Dễ đọc nếu content dài.

Khuyến nghị: bắt đầu với **Option A**, chỉ dùng hover background nhẹ.

---

## 19. Responsive trong sidebar hẹp

Sidebar hẹp dễ làm title/time bị vỡ layout. Cần đảm bảo:

```css
.pt-entry-header {
  grid-template-columns: auto minmax(0, 1fr) 24px;
}

.pt-entry-title {
  min-width: 0;
}
```

Nếu cần tối ưu thêm:

```css
@media (max-width: 320px) {
  .pt-entry {
    grid-template-columns: 30px minmax(0, 1fr);
    column-gap: 8px;
  }

  .pt-entry-header {
    grid-template-columns: 1fr 24px;
  }

  .pt-entry-time {
    grid-column: 1 / -1;
  }

  .pt-entry-title {
    grid-column: 1;
  }
}
```

---

## 20. Tích hợp với filter và composer compact

Timeline rail nên đi cùng layout tổng thể gọn:

```txt
Personal timeline                 Today

[Quick check-in...                    +]

[Search text, title, tags...           ]
[Today ▾] [Tags ▾] [Time ▾]

23/6/2026

●  22:57:23  Untitled check-in       ⋯
│            Timeline
│            📎 2 attachments
```

Composer nên collapsed mặc định. Filter cũng nên compact mặc định để timeline xuất hiện sớm.

---

## 21. Thứ tự triển khai khuyến nghị

```txt
1. Tạo CSS class cho vertical timeline.
2. Refactor TimelineList để group entries theo date.
3. Tạo renderDayGroup().
4. Tạo renderTimelineEntry().
5. Chuyển action buttons sang menu ba chấm.
6. Rút gọn attachment display thành summary.
7. Thêm expandedEntryIds state.
8. Chỉ render audio player khi expanded.
9. Tối ưu responsive cho sidebar hẹp.
10. Điều chỉnh dot/line để giống sketch.
```

---

## 22. Checklist triển khai

### Timeline structure

- [ ] Tạo `pt-day-group`.
- [ ] Tạo `pt-day-header`.
- [ ] Tạo `pt-timeline`.
- [ ] Tạo `pt-entry`.
- [ ] Tạo `pt-rail`.
- [ ] Tạo `pt-dot`.
- [ ] Tạo `pt-line`.
- [ ] Tạo `pt-entry-main`.

### Date grouping

- [ ] Group entries theo `date`.
- [ ] Sort day group mới nhất trước.
- [ ] Sort entry trong ngày theo `createdAt` mới nhất trước hoặc theo setting.
- [ ] Format date thành `D/M/YYYY`.

### Entry rendering

- [ ] Hiển thị time cạnh dot.
- [ ] Hiển thị title cạnh time.
- [ ] Hiển thị body preview.
- [ ] Hiển thị tags.
- [ ] Hiển thị attachment summary.
- [ ] Thêm menu ba chấm.

### Interaction

- [ ] Click entry để expand/collapse.
- [ ] Menu có Edit.
- [ ] Menu có Duplicate.
- [ ] Menu có Open source.
- [ ] Menu có Delete.
- [ ] Delete có confirm.

### Attachment

- [ ] Không hiển thị full path.
- [ ] Dùng basename.
- [ ] Full path nằm trong tooltip.
- [ ] Compact mode chỉ hiện summary.
- [ ] Expanded mode hiện danh sách attachment.
- [ ] Audio player chỉ hiện khi expanded.

### Theme

- [ ] Dùng `var(--text-normal)`.
- [ ] Dùng `var(--text-muted)`.
- [ ] Dùng `var(--text-accent)`.
- [ ] Dùng `var(--background-primary)`.
- [ ] Dùng `var(--background-secondary)`.
- [ ] Dùng `var(--background-modifier-border)`.
- [ ] Không hard-code màu chính.

---

## 23. Quyết định thiết kế cuối cùng

Áp dụng các quyết định sau:

```txt
Timeline display:
- Dùng vertical timeline rail.
- Mỗi ngày là một group.
- Mỗi entry có dot + line + content.

Entry:
- Compact mặc định.
- Expanded khi click.
- Action nằm trong menu ba chấm.

Attachment:
- Compact summary mặc định.
- Không hiển thị full path.
- Preview chi tiết khi expanded.

Audio:
- Không hiện audio player mặc định.
- Chỉ hiện audio player khi expanded.

Theme:
- Dùng CSS variables của Obsidian.

Layout:
- Composer compact.
- Filter compact.
- Timeline xuất hiện sớm trong viewport.
```

---

## 24. Ghi chú triển khai

Nếu plugin hiện tại đang dùng card list, không cần thay đổi storage hoặc schema. Chỉ cần thay đổi phần render UI:

```txt
Storage giữ nguyên:
- Daily Markdown file
- Hidden JSON comment
- Attachment file thật

Index giữ nguyên:
- TimelineIndexItem
- date/time/title/tags/attachments

Chỉ refactor:
- TimelineList
- TimelineCard → TimelineEntry
- CSS styles
- Attachment/audio render mode
```

Điều này giúp đổi UI mà không ảnh hưởng đến dữ liệu đã lưu.

---

## 25. Kết luận

Vertical timeline rail là lựa chọn phù hợp hơn cho plugin Personal Timeline vì:

- Đúng với ý tưởng timeline.
- Tiết kiệm không gian hơn card list.
- Dễ đọc trong sidebar Obsidian.
- Hỗ trợ tốt việc grouping theo ngày.
- Có thể mở rộng thêm dot color, expanded preview, audio/file attachment.

Thiết kế cuối cùng nên là:

```txt
Date heading

dot + time/title/content
line
dot + time/title/content
line
dot + time/title/content
```

Đây là hướng UI nên dùng cho phiên bản tiếp theo của plugin.
