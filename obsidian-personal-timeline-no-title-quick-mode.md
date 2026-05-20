# Tài liệu cập nhật: Quick Check-in tối giản không dùng Title

## 1. Mục tiêu

Tài liệu này cập nhật thiết kế UI và data flow cho plugin **Obsidian Personal Timeline** sau khi đã quyết định:

```txt
Không dùng Title trong plugin
Quick check-in dùng quick mode mặc định
Tối giản input và filter để không chiếm diện tích sidebar
```

Mục tiêu chính:

- Tạo check-in nhanh nhất có thể.
- Không bắt người dùng nhập title.
- UI phù hợp với sidebar Obsidian.
- Timeline xuất hiện sớm trong viewport.
- Filter không chiếm diện tích mặc định.
- Composer gọn, chỉ có nội dung, tags, attachments và nút gửi.
- Metadata JSON vẫn đầy đủ để plugin xử lý ổn định.

---

## 2. Quyết định thiết kế đã chốt

### 2.1. Bỏ Title khỏi plugin

Plugin không còn dùng field `title` trong quick flow mặc định.

Không hiển thị:

```txt
Title input
```

Không yêu cầu user nhập:

```txt
title
```

Entry được định danh và hiển thị chủ yếu bằng:

```txt
time
content preview
tags
attachments
```

### 2.2. Quick check-in dùng quick mode

Quick check-in không dùng full form mặc định.

Composer chỉ gồm:

```txt
Content
Tags optional
Attachment actions
Send
```

Layout:

```txt
┌─────────────────────────────────┐
│ What happened?                  │
│                                 │
│ #tags      🖼  📎  🎙     Send │
└─────────────────────────────────┘
```

### 2.3. Filter không chiếm layout chính

Không dùng filter card lớn mặc định.

Filter chuyển thành toolbar nhỏ:

```txt
Today · 6 entries          Search  Filter
```

Search và filter chỉ mở khi người dùng cần.

---

## 3. Layout tổng thể đề xuất

### 3.1. Layout mặc định

```txt
Personal timeline                         ↗
Today · 6 entries

[+ Quick check-in...]

Search  Filter

● 13:55
│  Hôm nay hơi mệt nhưng vẫn hoàn thành task.
│  #health
│
● 13:20
│  📎 1 attachment · 🎙 1
│
● 12:57
│  Nội dung check-in khác
```

### 3.2. Layout khi mở quick composer

```txt
Personal timeline                         ↗
Today · 6 entries

┌──────────────────────────────────────┐
│ What happened?                       │
│                                      │
│ #tags        🖼  📎  🎙       Send  │
└──────────────────────────────────────┘

Search  Filter

● 13:55
│  Hôm nay hơi mệt nhưng vẫn hoàn thành task.
│  #health
```

### 3.3. Layout khi search mở

```txt
Personal timeline                         ↗
Today · 6 entries

[+ Quick check-in...]

[Search text, content, tags...          ×]

Filter

● 13:55
│  Hôm nay hơi mệt nhưng vẫn hoàn thành task.
```

### 3.4. Layout khi filter mở

```txt
Personal timeline                         ↗
Today · 6 entries

[+ Quick check-in...]

Search  Filter

┌─────────────────────────────┐
│ Date: Today                 │
│ Tags: All tags              │
│ Time: Any time              │
│ Attachment: Any             │
└─────────────────────────────┘

● 13:55
│  Hôm nay hơi mệt nhưng vẫn hoàn thành task.
```

---

## 4. Quick Check-in tối giản

## 4.1. Trạng thái đóng

Mặc định composer ở trạng thái đóng:

```txt
[+ Quick check-in...]
```

Đặc điểm:

- Chiều cao khoảng 38-42px.
- Không có title.
- Không có textarea lớn.
- Không có attachment box.
- Click vào sẽ mở quick mode.

---

## 4.2. Trạng thái quick mode

Khi user click vào composer:

```txt
┌─────────────────────────────────┐
│ What happened?                  │
│                                 │
│ #tags      🖼  📎  🎙     Send │
└─────────────────────────────────┘
```

Thành phần:

| Thành phần | Mục đích |
|---|---|
| Content textarea | Nội dung check-in |
| Tags input | Tag optional |
| Image button | Thêm ảnh |
| File button | Thêm file |
| Audio button | Ghi âm |
| Send button | Tạo check-in |

Không có:

```txt
Title input
Full metadata form
Attachment box khi chưa có attachment
Open selected source
```

---

## 4.3. Khi có attachment

Nếu chưa có attachment, không hiển thị attachment box.

Khi có attachment:

```txt
┌─────────────────────────────────┐
│ What happened?                  │
│                                 │
│ #tags      🖼  📎  🎙     Send │
│ 📎 2 attachments           Clear│
└─────────────────────────────────┘
```

Click vào `📎 2 attachments` có thể expand:

```txt
📎 2 attachments
- image.png
- recording.webm
```

---

## 5. Luồng tạo check-in

```txt
User click [+ Quick check-in...]
→ Composer mở quick mode
→ Focus vào content textarea
→ User nhập content
→ Optional: nhập tags
→ Optional: thêm image/file/audio
→ User bấm Send
→ Plugin validate dữ liệu
→ Plugin tạo metadata JSON
→ Plugin append block vào daily markdown file
→ Composer clear
→ Composer collapse
→ Timeline refresh
```

---

## 6. Validation khi tạo check-in

Cho phép tạo check-in nếu có ít nhất một trong các dữ liệu:

```txt
content không rỗng
tags không rỗng
attachments không rỗng
audio recording có file
```

Không cho tạo nếu tất cả đều rỗng:

```ts
function canCreateQuickCheckIn(
  content: string,
  tags: string[],
  attachments: TimelineAttachment[]
) {
  return (
    content.trim().length > 0 ||
    tags.length > 0 ||
    attachments.length > 0
  );
}
```

Nếu không hợp lệ:

```txt
Nothing to save
```

---

## 7. Không dùng Title: cách hiển thị entry

Vì đã bỏ title khỏi plugin, timeline entry nên hiển thị:

```txt
time
content preview
tags
attachment summary
```

Ví dụ:

```txt
● 13:55
│  Hôm nay hơi mệt nhưng vẫn hoàn thành task.
│  #health
```

Nếu content rỗng nhưng có attachment:

```txt
● 13:20
│  📎 1 attachment · 🎙 1
```

Nếu content rỗng nhưng chỉ có tags:

```txt
● 12:40
│  #idea #work
```

---

## 8. Cập nhật metadata schema

### 8.1. Schema mới không dùng title

Nên loại bỏ `title` khỏi schema chính.

```ts
export type TimelineEntryType =
  | "checkin"
  | "note"
  | "image"
  | "audio"
  | "file"
  | "mixed";

export type TimelineEntrySource =
  | "quick-capture"
  | "manual"
  | "imported";

export type TimelineAttachmentType =
  | "image"
  | "audio"
  | "file";

export interface TimelineAttachment {
  id: string;
  type: TimelineAttachmentType;
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

### 8.2. Field đã loại bỏ

Không còn dùng:

```ts
title?: string;
```

Nếu code hiện tại còn `title`, cần refactor:

```txt
TimelineEntryMeta.title
TimelineIndexItem.title
render title trong card
title input trong composer
generateTitleFromContent()
heading title auto generation
```

---

## 9. Markdown output mới

### 9.1. Entry có content

User nhập:

```txt
Hôm nay hơi mệt nhưng vẫn hoàn thành task.
```

Tags:

```txt
health
```

Markdown tạo ra:

```md
## 13:55 ^tl-20260520-135500-a1b2

<!-- timeline-entry
{
  "schemaVersion": 1,
  "id": "tl-20260520-135500-a1b2",
  "type": "checkin",
  "date": "2026-05-20",
  "time": "13:55",
  "createdAt": "2026-05-20T13:55:00+07:00",
  "updatedAt": "2026-05-20T13:55:00+07:00",
  "tags": ["health"],
  "source": "quick-capture",
  "attachments": []
}
-->

Hôm nay hơi mệt nhưng vẫn hoàn thành task.
```

### 9.2. Entry chỉ có audio

```md
## 13:20 ^tl-20260520-132000-b2c3

<!-- timeline-entry
{
  "schemaVersion": 1,
  "id": "tl-20260520-132000-b2c3",
  "type": "audio",
  "date": "2026-05-20",
  "time": "13:20",
  "createdAt": "2026-05-20T13:20:00+07:00",
  "updatedAt": "2026-05-20T13:20:00+07:00",
  "tags": [],
  "source": "quick-capture",
  "attachments": [
    {
      "id": "att-20260520-132001-1",
      "type": "audio",
      "path": "Timeline Attachments/2026/05/20260520_132001_recording.webm",
      "name": "20260520_132001_recording.webm",
      "mime": "audio/webm"
    }
  ]
}
-->

![[Timeline Attachments/2026/05/20260520_132001_recording.webm]]
```

### 9.3. Entry có image và text

```md
## 14:05 ^tl-20260520-140500-d4e5

<!-- timeline-entry
{
  "schemaVersion": 1,
  "id": "tl-20260520-140500-d4e5",
  "type": "mixed",
  "date": "2026-05-20",
  "time": "14:05",
  "createdAt": "2026-05-20T14:05:00+07:00",
  "updatedAt": "2026-05-20T14:05:00+07:00",
  "tags": ["idea"],
  "source": "quick-capture",
  "attachments": [
    {
      "id": "att-20260520-140501-1",
      "type": "image",
      "path": "Timeline Attachments/2026/05/sketch.png",
      "name": "sketch.png",
      "mime": "image/png"
    }
  ]
}
-->

Ý tưởng layout timeline mới.

![[Timeline Attachments/2026/05/sketch.png]]
```

---

## 10. Heading format mới

Vì không còn title, heading chỉ cần:

```md
## HH:mm ^entry-id
```

Ví dụ:

```md
## 13:55 ^tl-20260520-135500-a1b2
```

Nếu muốn có giây:

```md
## 13:55:23 ^tl-20260520-135523-a1b2
```

Khuyến nghị:

```txt
UI hiển thị: HH:mm hoặc HH:mm:ss tùy setting
Markdown heading: dùng cùng time với metadata
```

---

## 11. Parse heading mới

Parser cũ có thể đang tìm heading dạng:

```md
## 13:55 Title ^tl-...
```

Cần sửa để chấp nhận heading không title:

```ts
const TIMELINE_HEADING_REGEX =
  /^##\s+([0-9]{2}:[0-9]{2}(?::[0-9]{2})?)\s+\^(tl-[A-Za-z0-9_-]+)\s*$/gm;
```

Parse:

```ts
while ((headingMatch = TIMELINE_HEADING_REGEX.exec(markdown)) !== null) {
  headings.push({
    time: headingMatch[1],
    id: headingMatch[2],
    start: headingMatch.index,
    end: TIMELINE_HEADING_REGEX.lastIndex,
  });
}
```

Nếu muốn tương thích ngược với entry cũ còn title, dùng regex rộng hơn:

```ts
const TIMELINE_HEADING_REGEX =
  /^##\s+([0-9]{2}:[0-9]{2}(?::[0-9]{2})?)(?:\s+.*?)?\s+\^(tl-[A-Za-z0-9_-]+)\s*$/gm;
```

Regex này hỗ trợ cả:

```md
## 13:55 ^tl-xxx
## 13:55 Old title ^tl-xxx
```

---

## 12. Timeline index item mới

Cập nhật `TimelineIndexItem` không còn title:

```ts
export interface TimelineIndexItem {
  id: string;
  type: TimelineEntryType;
  date: string;
  time: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  attachmentTypes: TimelineAttachmentType[];
  attachments: TimelineAttachment[];
  sourcePath: string;
  blockId: string;
  textPreview: string;
  meta: TimelineEntryMeta;
}
```

Không còn:

```ts
title?: string;
```

---

## 13. Tạo text preview

Vì không có title, `textPreview` trở nên quan trọng hơn.

```ts
function extractTextPreview(markdown: string, maxLength = 120) {
  const withoutComment = markdown.replace(
    /<!--\s*timeline-entry\s*[\s\S]*?\s*-->/g,
    ""
  );

  const withoutHeading = withoutComment.replace(
    /^##\s+.*$/gm,
    ""
  );

  const withoutEmbeds = withoutHeading.replace(
    /!\[\[.*?\]\]/g,
    ""
  );

  const text = withoutEmbeds
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 3)}...`;
}
```

Nếu không có text preview:

```ts
function getEntryDisplayText(entry: TimelineIndexItem) {
  if (entry.textPreview) return entry.textPreview;

  if (entry.attachments.length > 0) {
    return getAttachmentSummaryText(entry.attachments);
  }

  if (entry.tags.length > 0) {
    return entry.tags.map((tag) => `#${tag}`).join(" ");
  }

  return "Empty check-in";
}
```

---

## 14. Detect entry type

Vì không có title, type nên dựa trên content và attachments.

```ts
function detectEntryType(
  content: string,
  attachments: TimelineAttachment[]
): TimelineEntryType {
  const hasText = content.trim().length > 0;
  const hasImage = attachments.some((a) => a.type === "image");
  const hasAudio = attachments.some((a) => a.type === "audio");
  const hasFile = attachments.some((a) => a.type === "file");

  const attachmentTypeCount = [hasImage, hasAudio, hasFile].filter(Boolean).length;

  if (hasText && attachments.length === 0) return "checkin";
  if (hasText && attachments.length > 0) return "mixed";
  if (attachmentTypeCount > 1) return "mixed";
  if (hasImage) return "image";
  if (hasAudio) return "audio";
  if (hasFile) return "file";

  return "checkin";
}
```

---

## 15. Parse tags

Tags input hỗ trợ cả comma và hashtag.

User nhập:

```txt
work, meeting, health
```

hoặc:

```txt
#work #meeting #health
```

Parser:

```ts
function parseTags(input: string) {
  return input
    .split(/[,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.replace(/^#/, ""))
    .filter((tag, index, arr) => arr.indexOf(tag) === index);
}
```

JSON lưu:

```json
"tags": ["work", "meeting", "health"]
```

UI hiển thị:

```txt
#work #meeting #health
```

---

## 16. Quick composer state

State tối giản:

```ts
interface QuickComposerState {
  isOpen: boolean;
  content: string;
  tagsInput: string;
  attachments: TimelineAttachment[];
  isRecording: boolean;
  isAttachmentListOpen: boolean;
}
```

Không còn:

```ts
title
composerMode
advancedTitle
```

---

## 17. Timeline view state

```ts
interface TimelineViewState {
  selectedDate: string;

  isSearchOpen: boolean;
  isFilterOpen: boolean;

  searchQuery: string;
  selectedTags: string[];
  startTime?: string;
  endTime?: string;
  attachmentFilter?: "all" | "image" | "audio" | "file";

  quickComposer: QuickComposerState;

  expandedEntryIds: Set<string>;
}
```

---

## 18. Render Quick Composer

### 18.1. Render tổng

```ts
function renderQuickComposer(container: HTMLElement) {
  if (!state.quickComposer.isOpen) {
    renderCollapsedQuickComposer(container);
    return;
  }

  renderQuickModeComposer(container);
}
```

### 18.2. Collapsed composer

```ts
function renderCollapsedQuickComposer(container: HTMLElement) {
  const el = container.createDiv({
    cls: "pt-quick-collapsed",
    text: "+ Quick check-in...",
  });

  el.addEventListener("click", () => {
    state.quickComposer.isOpen = true;
    render();
  });
}
```

### 18.3. Quick mode composer

```ts
function renderQuickModeComposer(container: HTMLElement) {
  const wrap = container.createDiv({ cls: "pt-quick-composer" });

  const textarea = wrap.createEl("textarea", {
    cls: "pt-quick-content",
    attr: {
      placeholder: "What happened?",
    },
  });

  textarea.value = state.quickComposer.content;

  textarea.addEventListener("input", () => {
    state.quickComposer.content = textarea.value;
  });

  const row = wrap.createDiv({ cls: "pt-quick-row" });

  const tagsInput = row.createEl("input", {
    cls: "pt-quick-tags",
    attr: {
      placeholder: "#tags",
    },
  });

  tagsInput.value = state.quickComposer.tagsInput;

  tagsInput.addEventListener("input", () => {
    state.quickComposer.tagsInput = tagsInput.value;
  });

  const imageButton = row.createEl("button", {
    cls: "pt-icon-button",
    text: "🖼",
  });
  imageButton.setAttr("title", "Add image");

  const fileButton = row.createEl("button", {
    cls: "pt-icon-button",
    text: "📎",
  });
  fileButton.setAttr("title", "Add file");

  const audioButton = row.createEl("button", {
    cls: "pt-icon-button",
    text: "🎙",
  });
  audioButton.setAttr("title", "Record audio");

  const sendButton = row.createEl("button", {
    cls: "pt-send-button",
    text: "Send",
  });

  sendButton.addEventListener("click", async () => {
    await createQuickCheckIn();
  });

  renderQuickAttachmentSummary(wrap);
}
```

---

## 19. Render attachment summary trong composer

```ts
function renderQuickAttachmentSummary(container: HTMLElement) {
  const attachments = state.quickComposer.attachments;

  if (!attachments.length) return;

  const row = container.createDiv({
    cls: "pt-quick-attachments",
  });

  const summary = row.createSpan({
    cls: "pt-quick-attachments-summary",
    text: `📎 ${attachments.length} attachments`,
  });

  summary.addEventListener("click", () => {
    state.quickComposer.isAttachmentListOpen =
      !state.quickComposer.isAttachmentListOpen;
    render();
  });

  const clearButton = row.createEl("button", {
    cls: "pt-clear-attachments",
    text: "Clear",
  });

  clearButton.addEventListener("click", () => {
    state.quickComposer.attachments = [];
    state.quickComposer.isAttachmentListOpen = false;
    render();
  });

  if (state.quickComposer.isAttachmentListOpen) {
    const list = container.createDiv({
      cls: "pt-quick-attachment-list",
    });

    for (const attachment of attachments) {
      list.createDiv({
        cls: "pt-quick-attachment-item",
        text: getBasename(attachment.path),
      });
    }
  }
}
```

---

## 20. Create quick check-in

```ts
async function createQuickCheckIn() {
  const content = state.quickComposer.content.trim();
  const tags = parseTags(state.quickComposer.tagsInput);
  const attachments = state.quickComposer.attachments;

  if (!canCreateQuickCheckIn(content, tags, attachments)) {
    new Notice("Nothing to save");
    return;
  }

  const now = new Date();
  const date = formatDate(now);
  const time = formatTime(now);
  const nowIso = now.toISOString();
  const id = createTimelineEntryId(now);

  const meta: TimelineEntryMeta = {
    schemaVersion: 1,
    id,
    type: detectEntryType(content, attachments),
    date,
    time,
    createdAt: nowIso,
    updatedAt: nowIso,
    tags,
    source: "quick-capture",
    attachments,
  };

  const markdown = createTimelineEntryBlock(meta, content, attachments);

  await appendEntryToTimelineDay(date, markdown);

  resetQuickComposer();
  await refreshTimeline();
}
```

---

## 21. Reset composer sau khi send

```ts
function resetQuickComposer() {
  state.quickComposer = {
    isOpen: false,
    content: "",
    tagsInput: "",
    attachments: [],
    isRecording: false,
    isAttachmentListOpen: false,
  };
}
```

---

## 22. Tạo Markdown block không title

```ts
function createTimelineEntryBlock(
  meta: TimelineEntryMeta,
  content: string,
  attachments: TimelineAttachment[]
): string {
  const json = JSON.stringify(meta, null, 2);
  const attachmentMarkdown = createAttachmentMarkdown(attachments);

  const bodyParts = [
    content.trim(),
    attachmentMarkdown.trim(),
  ].filter(Boolean);

  return [
    `## ${meta.time} ^${meta.id}`,
    "",
    "<!-- timeline-entry",
    json,
    "-->",
    "",
    bodyParts.join("\n\n"),
    "",
  ].join("\n");
}
```

Attachment markdown:

```ts
function createAttachmentMarkdown(attachments: TimelineAttachment[]) {
  return attachments
    .map((attachment) => {
      if (attachment.type === "image" || attachment.type === "audio") {
        return `![[${attachment.path}]]`;
      }

      return `[[${attachment.path}]]`;
    })
    .join("\n");
}
```

---

## 23. Render timeline entry không title

Với vertical timeline rail:

```txt
● 13:55
│ Hôm nay hơi mệt nhưng vẫn hoàn thành task.
│ #health
```

Render:

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

  const menuButton = headerEl.createEl("button", {
    cls: "pt-entry-menu",
    text: "⋯",
  });

  menuButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openEntryMenu(event, entry);
  });

  const displayText = getEntryDisplayText(entry);

  if (displayText) {
    mainEl.createDiv({
      cls: "pt-entry-body",
      text: displayText,
    });
  }

  renderEntryTags(mainEl, entry.tags);
  renderAttachmentSummary(mainEl, entry.attachments);
}
```

Header grid không còn title:

```css
.pt-entry-header {
  display: grid;
  grid-template-columns: auto 24px;
  gap: 8px;
  align-items: baseline;
  justify-content: start;
}
```

---

## 24. CSS cho composer tối giản

```css
.pt-quick-collapsed {
  min-height: 38px;
  padding: 8px 10px;
  margin-bottom: 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 10px;
  background: var(--background-secondary);
  color: var(--text-muted);
  cursor: text;
}

.pt-quick-composer {
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 12px;
  background: var(--background-secondary);
}

.pt-quick-content {
  width: 100%;
  min-height: 64px;
  max-height: 140px;
  resize: vertical;
  margin-bottom: 8px;
}

.pt-quick-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px 32px 32px auto;
  gap: 6px;
  align-items: center;
}

.pt-quick-tags {
  min-width: 0;
}

.pt-icon-button {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 8px;
}

.pt-send-button {
  min-height: 32px;
  padding: 4px 10px;
  border-radius: 8px;
}

.pt-quick-attachments {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 0.85em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pt-quick-attachments-summary {
  cursor: pointer;
}

.pt-clear-attachments {
  font-size: 0.8em;
  padding: 2px 8px;
}

.pt-quick-attachment-list {
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
}

.pt-quick-attachment-item {
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

## 25. CSS cho filter tối giản

```css
.pt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.pt-toolbar-meta {
  color: var(--text-muted);
  font-size: 0.85em;
}

.pt-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pt-toolbar-button {
  min-height: 30px;
  padding: 4px 8px;
  font-size: 0.85em;
}

.pt-search-inline {
  width: 100%;
  min-height: 34px;
  margin-bottom: 8px;
}

.pt-filter-popover {
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
}
```

---

## 26. CSS cho timeline entry không title

```css
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
  grid-template-columns: auto 24px;
  gap: 8px;
  align-items: center;
  justify-content: start;
}

.pt-entry-time {
  color: var(--text-accent);
  font-size: 0.9em;
  font-variant-numeric: tabular-nums;
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
```

---

## 27. Filter search không còn title

Vì plugin không dùng title, search chỉ cần tìm trong:

```txt
content preview
tags
attachment names
time
date
```

Không search theo title nữa.

```ts
function matchesSearch(entry: TimelineIndexItem, query: string) {
  const q = query.trim().toLowerCase();

  if (!q) return true;

  const haystack = [
    entry.textPreview,
    entry.time,
    entry.date,
    ...entry.tags,
    ...entry.attachments.map((a) => a.name ?? a.path),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}
```

Placeholder nên đổi:

```txt
Search content, tags, files
```

Không dùng:

```txt
Search text, title, tags
```

---

## 28. Cập nhật Reading View metadata

Nếu trước đó metadata view có hiển thị title, cần bỏ title row.

Table mode mới:

```ts
renderMetadataRow(tableEl, "id", meta.id);
renderMetadataRow(tableEl, "type", meta.type);
renderMetadataRow(tableEl, "date", meta.date);
renderMetadataRow(tableEl, "time", meta.time);
renderMetadataRow(tableEl, "createdAt", meta.createdAt);
renderMetadataRow(tableEl, "updatedAt", meta.updatedAt);
renderMetadataRow(tableEl, "tags", meta.tags.join(", "));
renderMetadataRow(tableEl, "source", meta.source);
renderMetadataRow(tableEl, "attachments", String(meta.attachments.length));
```

Summary mode:

```ts
const summary = [
  meta.type,
  meta.date,
  meta.time,
  `${meta.tags.length} tags`,
  `${meta.attachments.length} attachments`,
].join(" · ");
```

---

## 29. Migration từ entry cũ có title

Nếu dữ liệu cũ còn JSON có `title`, parser nên không crash. Có thể bỏ qua field này.

```ts
type LegacyTimelineEntryMeta = TimelineEntryMeta & {
  title?: string;
};
```

Khi parse:

```ts
const raw = JSON.parse(jsonMatch[1].trim()) as LegacyTimelineEntryMeta;

const meta: TimelineEntryMeta = {
  schemaVersion: raw.schemaVersion,
  id: raw.id,
  type: raw.type,
  date: raw.date,
  time: raw.time,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
  tags: raw.tags ?? [],
  mood: raw.mood ?? null,
  source: raw.source,
  attachments: raw.attachments ?? [],
};
```

Heading cũ:

```md
## 13:55 Old title ^tl-xxx
```

vẫn parse được bằng regex tương thích:

```ts
const TIMELINE_HEADING_REGEX =
  /^##\s+([0-9]{2}:[0-9]{2}(?::[0-9]{2})?)(?:\s+.*?)?\s+\^(tl-[A-Za-z0-9_-]+)\s*$/gm;
```

Khi edit/save lại entry, plugin có thể ghi lại theo format mới:

```md
## 13:55 ^tl-xxx
```

---

## 30. Checklist cập nhật plugin

### UI

- [ ] Xóa title input khỏi composer.
- [ ] Composer mặc định collapsed.
- [ ] Quick composer chỉ có content, tags, image, file, audio, send.
- [ ] Attachment box chỉ hiện khi có attachment.
- [ ] Clear attachment chỉ hiện khi có attachment.
- [ ] Filter chuyển thành toolbar nhỏ.
- [ ] Search placeholder đổi thành `Search content, tags, files`.

### Data model

- [ ] Xóa `title` khỏi `TimelineEntryMeta`.
- [ ] Xóa `title` khỏi `TimelineIndexItem`.
- [ ] Xóa logic `generateTitleFromContent`.
- [ ] Cập nhật create entry meta không có title.
- [ ] Cập nhật JSON output không có title.

### Markdown format

- [ ] Heading đổi thành `## HH:mm ^entry-id`.
- [ ] Parser hỗ trợ heading không title.
- [ ] Parser tương thích heading cũ có title.
- [ ] Create block không ghi title.

### Render timeline

- [ ] Timeline entry chỉ hiển thị time.
- [ ] Body hiển thị text preview.
- [ ] Nếu không có text, hiển thị attachment summary.
- [ ] Nếu không có text và attachment, hiển thị tags.
- [ ] Menu ba chấm giữ nguyên.

### Search/filter

- [ ] Search không dùng title.
- [ ] Search content/tags/file names/date/time.
- [ ] Filter tags giữ nguyên.
- [ ] Filter time giữ nguyên.
- [ ] Filter attachment giữ nguyên.

### Reading view metadata

- [ ] Bỏ title khỏi metadata table.
- [ ] Bỏ title khỏi raw schema mới.
- [ ] Vẫn parse legacy title nếu có.
- [ ] Không hiển thị title trong summary.

### Migration

- [ ] Parser không lỗi khi gặp JSON cũ có title.
- [ ] Parser không lỗi khi gặp heading cũ có title.
- [ ] Khi update entry cũ, ghi lại theo format mới.

---

## 31. Kết luận

Thiết kế mới của plugin là:

```txt
Không có Title
Không có title input
Không generate title
Không search title
Không render title
```

Entry được hiển thị bằng:

```txt
time
content preview
tags
attachments
```

Quick check-in tối giản:

```txt
[What happened?]
[#tags   🖼 📎 🎙   Send]
```

Markdown block mới:

```md
## HH:mm ^entry-id

<!-- timeline-entry
{
  "schemaVersion": 1,
  "id": "entry-id",
  "type": "checkin",
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "createdAt": "ISO",
  "updatedAt": "ISO",
  "tags": [],
  "source": "quick-capture",
  "attachments": []
}
-->

Content
```

Đây là hướng tối giản, phù hợp hơn với sidebar Obsidian và đúng tinh thần check-in nhanh theo timeline.
