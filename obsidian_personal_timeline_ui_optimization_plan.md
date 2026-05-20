# Kế hoạch tối ưu UI cho Obsidian Personal Timeline Plugin

## 1. Mục tiêu tài liệu

Tài liệu này mô tả các thay đổi cần thực hiện để tối ưu giao diện plugin Personal Timeline trong Obsidian, dựa trên UI hiện tại đã triển khai.

Mục tiêu chính:

- Tối ưu không gian hiển thị trong sidebar Obsidian.
- Đưa timeline trở thành nội dung trung tâm.
- Giảm chiều cao của filter và quick check-in.
- Làm timeline card gọn hơn.
- Hiển thị attachment hợp lý, không làm vỡ layout.
- Tạo cảm giác native hơn với Obsidian theme.

---

## 2. Vấn đề hiện tại

UI hiện tại đã có đầy đủ các chức năng cơ bản:

- Header `Personal timeline`.
- Bộ filter gồm search, date, tag, time.
- Quick check-in form.
- Timeline list.
- Timeline card.
- Attachment preview.
- Audio playback.
- Action buttons: Edit, Duplicate, Delete, Open source.

Tuy nhiên, trong sidebar Obsidian, UI hiện tại gặp các vấn đề sau:

### 2.1. Filter panel quá lớn

Filter hiện tại chiếm nhiều chiều cao vì có nhiều input được hiển thị cùng lúc:

```txt
Search input
Date selector
Tag selector
Start time
End time
Entry count
```

Điều này làm timeline bị đẩy xuống dưới.

### 2.2. Quick check-in form quá cao

Quick check-in đang luôn mở đầy đủ:

```txt
Title input
Tags input
Content textarea lớn
Add image
Add file
Record audio
Clear attachments
Attachment box
Create check-in
Open selected source
```

Form này chiếm gần hết viewport sidebar, khiến người dùng phải scroll nhiều để xem timeline.

### 2.3. Timeline card chưa compact

Mỗi timeline card hiện đang có:

- Padding lớn.
- Action buttons hiển thị thành hàng.
- Attachment path dài.
- Audio player luôn hiện.
- Khoảng cách giữa các phần khá rộng.

Kết quả là mỗi card chiếm nhiều chiều cao hơn cần thiết.

### 2.4. Attachment path làm vỡ layout

Attachment đang hiển thị dạng full path:

```txt
Timeline Attachments/2026/05/20260520_125700_1_67948669_...
```

Điều này không phù hợp với sidebar hẹp.

### 2.5. Action buttons chiếm không gian

Các nút sau đang hiển thị trực tiếp trên mỗi card:

```txt
Edit
Duplicate
Delete
Open source
```

Trong timeline list, nhóm nút này gây tốn diện tích và tạo cảm giác UI nặng.

---

## 3. Nguyên tắc thiết kế mới

UI sau khi tối ưu cần theo các nguyên tắc sau:

```txt
Timeline-first
Capture-fast
Compact by default
Expand on demand
Native with Obsidian theme
```

Diễn giải:

- Timeline-first: timeline phải xuất hiện sớm trong viewport.
- Capture-fast: tạo check-in nhanh, ít thao tác.
- Compact by default: filter, composer, attachment, action nên thu gọn mặc định.
- Expand on demand: chỉ mở chi tiết khi người dùng cần.
- Native with Obsidian theme: dùng CSS variables của Obsidian.

---

## 4. Layout tổng thể đề xuất

### 4.1. Layout hiện tại

```txt
Header
Filter panel lớn
Quick check-in form lớn
Timeline list
```

### 4.2. Layout cần chuyển sang

```txt
Header compact
Quick capture compact
Filter compact
Timeline summary
Timeline list
```

### 4.3. Mockup text

```txt
Personal timeline                 Today

[Quick check-in...                    +]

[Search text, title, tags...           ]
[Today ▾] [Tags ▾] [Time ▾]

Today · 4 entries

12:57  Untitled check-in           ⋯
       Timeline
       📎 2 attachments · 🎙 audio

12:50  fef                         ⋯
       fefe
       #fef

12:44  fef                         ⋯
       aeàèwf

12:42  test                        ⋯
       fefe
```

---

## 5. Refactor Quick Check-in

## 5.1. Mục tiêu

Quick check-in không nên luôn hiển thị full form. Mặc định nên là một composer compact. Khi người dùng click hoặc bấm nút mở rộng, form mới expand.

---

## 5.2. Trạng thái collapsed

Collapsed composer:

```txt
[Quick check-in...                    +]
```

Hoặc:

```txt
┌────────────────────────────────────┐
│ What happened?                  +  │
└────────────────────────────────────┘
```

Chỉ nên cao khoảng 40-48px.

---

## 5.3. Trạng thái expanded

Expanded composer:

```txt
Quick check-in

[Title]
[Tags]
[Content textarea]
[+ Image] [+ File] [🎙 Record]

Attachments (2)
- image.png
- recording.webm

[Create check-in]
```

---

## 5.4. Các trường nên hiển thị trong collapsed mode

Collapsed mode chỉ cần:

- Placeholder text.
- Nút `+` hoặc icon expand.

Không nên hiển thị:

- Title input.
- Tags input.
- Textarea lớn.
- Attachment list.
- Clear attachments.
- Open selected source.

---

## 5.5. Hành vi đề xuất

```txt
User click vào collapsed composer
→ Composer expand
→ Focus vào content textarea

User tạo check-in thành công
→ Clear form
→ Composer collapse lại
→ Timeline update entry mới

User bấm Esc hoặc Cancel
→ Composer collapse
→ Nếu có dữ liệu chưa lưu thì confirm
```

---

## 5.6. Checklist triển khai

- [ ] Tạo state `isComposerExpanded`.
- [ ] Mặc định `isComposerExpanded = false`.
- [ ] Khi click composer collapsed, set `true`.
- [ ] Sau khi tạo entry thành công, set `false`.
- [ ] Ẩn attachment section khi collapsed.
- [ ] Ẩn title/tags/textarea khi collapsed.
- [ ] Thêm nút Cancel trong expanded mode.
- [ ] Không đặt `Open selected source` trong composer.

---

## 6. Refactor Filter Panel

## 6.1. Mục tiêu

Filter cần gọn hơn để không đẩy timeline xuống quá sâu.

---

## 6.2. Filter compact

Mặc định hiển thị:

```txt
[Search text, title, tags...]
[Today ▾] [Tags ▾] [Time ▾]
```

Trong đó:

- Search input nằm full width.
- Date, tag, time là các control nhỏ.
- Advanced filters chỉ mở khi cần.

---

## 6.3. Advanced filter

Có thể thêm nút:

```txt
Filters ▾
```

Khi mở:

```txt
Date: 20/05/2026
Tags: All tags
Start time: --:--
End time: --:--
Attachment: All
```

---

## 6.4. Entry count

Không nên đặt `4 entries` bên trong filter panel. Nên đưa ra trước timeline list:

```txt
Today · 4 entries
```

---

## 6.5. Checklist triển khai

- [ ] Giảm padding của filter panel.
- [ ] Search input full width nhưng height nhỏ hơn.
- [ ] Date/tag/time đặt cùng một hàng nếu đủ rộng.
- [ ] Với sidebar hẹp, dùng wrap tự nhiên.
- [ ] Tạo state `isFilterExpanded` nếu có advanced filter.
- [ ] Đưa entry count ra ngoài filter panel.
- [ ] Dùng label ngắn: `Today`, `Tags`, `Time`.
- [ ] Không hiển thị start/end time nếu chưa bật time filter.

---

## 7. Refactor Timeline Card

## 7.1. Mục tiêu

Timeline card cần hiển thị nhiều entry hơn trong cùng một viewport.

---

## 7.2. Card hiện tại

```txt
12:50   fef
fefe

#fef

[Edit] [Duplicate] [Delete] [Open source]
```

---

## 7.3. Card compact đề xuất

```txt
┌────────────────────────────────────┐
│ 12:50  fef                     ⋯  │
│        fefe                        │
│        #fef                        │
└────────────────────────────────────┘
```

Nếu có attachment:

```txt
┌────────────────────────────────────┐
│ 12:57  Untitled check-in       ⋯  │
│        Timeline                    │
│        📎 2 attachments · 🎙 audio │
└────────────────────────────────────┘
```

---

## 7.4. Grid layout cho card header

Header nên có 3 cột:

```txt
time | title | menu
```

Ví dụ:

```css
.timeline-card-header {
  display: grid;
  grid-template-columns: 52px 1fr 28px;
  gap: 8px;
  align-items: center;
}
```

---

## 7.5. Action buttons chuyển thành menu

Không nên hiển thị trực tiếp các nút:

```txt
Edit
Duplicate
Delete
Open source
```

Thay bằng menu ba chấm:

```txt
⋯
```

Menu item:

```txt
Edit
Duplicate
Open source
Delete
```

Quy tắc:

- `Delete` nên nằm cuối menu.
- Có thể dùng màu warning/danger cho delete.
- Menu chỉ mở khi click.
- Icon menu có thể mờ mặc định, rõ khi hover.

---

## 7.6. Checklist triển khai

- [ ] Giảm padding card xuống khoảng `10px 12px`.
- [ ] Dùng grid layout cho header.
- [ ] Chuyển action buttons sang menu `⋯`.
- [ ] Giảm margin giữa các card xuống khoảng `8px`.
- [ ] Body content căn theo title, không bắt đầu từ sát mép trái.
- [ ] Title dùng ellipsis khi quá dài.
- [ ] Tags dùng pill nhỏ.
- [ ] Card hover chỉ làm nổi menu/action.

---

## 8. Refactor Attachment Display

## 8.1. Mục tiêu

Attachment không được làm vỡ layout và không nên hiển thị full path trong card.

---

## 8.2. Không hiển thị full path

Không nên:

```txt
Timeline Attachments/2026/05/20260520_125700_1_67948669_446171885984919_5609556712564.png
```

Nên hiển thị:

```txt
📎 2 attachments
```

Hoặc:

```txt
🖼 image.png
🎙 recording.webm
```

---

## 8.3. Tooltip cho full path

Nếu cần giữ full path, chỉ đưa vào tooltip:

```html
<span title="Timeline Attachments/2026/05/recording.webm">
  recording.webm
</span>
```

---

## 8.4. Filename truncate

CSS:

```css
.timeline-attachment-name {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
```

---

## 8.5. Compact attachment summary

Trong compact card:

```txt
📎 2 attachments · 🖼 1 image · 🎙 1 audio
```

Hoặc ngắn hơn:

```txt
📎 2 attachments
```

---

## 8.6. Expanded attachment preview

Khi card expanded mới hiển thị chi tiết:

```txt
Attachments
- 🖼 image.png
- 🎙 recording.webm

[audio player]
```

---

## 8.7. Checklist triển khai

- [ ] Thay full path bằng basename.
- [ ] Thêm tooltip chứa full path.
- [ ] Dùng ellipsis cho filename dài.
- [ ] Compact mode chỉ hiển thị attachment summary.
- [ ] Expanded mode mới hiển thị list attachment.
- [ ] Không hiển thị audio player mặc định trong compact card.

---

## 9. Refactor Audio Preview

## 9.1. Vấn đề

Native audio player chiếm nhiều chiều cao trong timeline card.

---

## 9.2. Hành vi đề xuất

Compact mode:

```txt
🎙 1 audio
```

Expanded mode:

```txt
🎙 recording.webm
[audio controls]
```

---

## 9.3. Checklist triển khai

- [ ] Không render audio player khi card collapsed.
- [ ] Render audio player khi user expand card.
- [ ] Hoặc render audio player trong popover/modal.
- [ ] Audio filename cần được truncate.
- [ ] Audio path đầy đủ chỉ nằm trong tooltip.

---

## 10. Open Source Action

## 10.1. Vấn đề hiện tại

Nút `Open selected source` đang nằm trong Quick check-in form, nhưng không rõ entry nào đang được chọn.

---

## 10.2. Thay đổi đề xuất

Không đặt `Open selected source` trong composer.

Thay vào đó:

### Header action

```txt
Personal timeline              Open today note
```

Dùng để mở file timeline của ngày đang xem.

### Card menu action

```txt
⋯ → Open source
```

Dùng để mở đúng block entry.

---

## 10.3. Checklist triển khai

- [ ] Xóa `Open selected source` khỏi composer.
- [ ] Thêm `Open today note` ở header hoặc gần date selector.
- [ ] Giữ `Open source` trong menu từng card.
- [ ] Nếu có selected entry thật, cần hiển thị selected state rõ ràng.

---

## 11. CSS dùng biến của Obsidian

## 11.1. Mục tiêu

Plugin cần hòa hợp với dark/light theme và custom theme của Obsidian.

---

## 11.2. Không nên hard-code màu

Không nên dùng màu cố định quá nhiều:

```css
color: #ff7ab6;
background: #1a1f26;
```

---

## 11.3. Nên dùng CSS variables

```css
.timeline-view {
  color: var(--text-normal);
  background: var(--background-primary);
}

.timeline-card {
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
}

.timeline-entry-time {
  color: var(--text-accent);
}

.timeline-entry-title {
  color: var(--text-normal);
  font-weight: 600;
}

.timeline-muted {
  color: var(--text-muted);
}

.timeline-button {
  background: var(--interactive-normal);
  color: var(--text-normal);
}
```

---

## 12. Spacing chuẩn cho sidebar

## 12.1. Giá trị đề xuất

```css
.timeline-view {
  padding: 12px;
}

.timeline-section {
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.timeline-card {
  padding: 10px 12px;
  margin-bottom: 8px;
}

.timeline-card-header {
  display: grid;
  grid-template-columns: 52px 1fr 28px;
  gap: 8px;
  align-items: center;
}

.timeline-entry-body {
  margin-left: 60px;
  margin-top: 4px;
  line-height: 1.4;
}
```

---

## 13. CSS mẫu cho timeline card compact

```css
.timeline-card {
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 12px;
  background: var(--background-secondary);
}

.timeline-card-header {
  display: grid;
  grid-template-columns: 52px 1fr 28px;
  gap: 8px;
  align-items: center;
}

.timeline-entry-time {
  color: var(--text-accent);
  font-size: 0.85em;
  font-variant-numeric: tabular-nums;
}

.timeline-entry-title {
  color: var(--text-normal);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline-entry-menu {
  opacity: 0.65;
}

.timeline-card:hover .timeline-entry-menu {
  opacity: 1;
}

.timeline-entry-body {
  margin-left: 60px;
  margin-top: 4px;
  color: var(--text-normal);
  line-height: 1.4;
}

.timeline-entry-tags {
  margin-left: 60px;
  margin-top: 6px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.timeline-tag {
  font-size: 0.78em;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--background-modifier-hover);
  color: var(--text-muted);
}

.timeline-attachments {
  margin-left: 60px;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 0.85em;
}

.timeline-attachment-name {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
```

---

## 14. CSS mẫu cho compact composer

```css
.timeline-composer-collapsed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  padding: 8px 12px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 12px;
  background: var(--background-secondary);
  color: var(--text-muted);
  cursor: text;
}

.timeline-composer-expanded {
  padding: 12px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 12px;
  background: var(--background-secondary);
}

.timeline-composer-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.timeline-composer textarea {
  min-height: 96px;
  resize: vertical;
}
```

---

## 15. CSS mẫu cho compact filter

```css
.timeline-filter {
  padding: 10px 12px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 12px;
  background: var(--background-secondary);
  margin-bottom: 12px;
}

.timeline-filter-search {
  width: 100%;
  margin-bottom: 8px;
}

.timeline-filter-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.timeline-filter-row > * {
  flex: 1 1 90px;
  min-width: 0;
}
```

---

## 16. Component state đề xuất

```ts
interface TimelineViewState {
  selectedDate: string;
  searchQuery: string;
  selectedTags: string[];
  startTime?: string;
  endTime?: string;
  isComposerExpanded: boolean;
  isFilterExpanded: boolean;
  expandedEntryIds: Set<string>;
}
```

---

## 17. Timeline card render logic

Pseudo logic:

```ts
function renderTimelineCard(entry: TimelineIndexItem) {
  const isExpanded = state.expandedEntryIds.has(entry.id);

  renderHeader({
    time: entry.time,
    title: entry.title || "Untitled check-in",
    menu: true,
  });

  renderPreview(entry.textPreview);
  renderTags(entry.tags);

  if (isExpanded) {
    renderAttachmentList(entry.attachments);
    renderAudioPlayers(entry.attachments.filter(a => a.type === "audio"));
  } else {
    renderAttachmentSummary(entry.attachments);
  }
}
```

---

## 18. Menu action render logic

Menu items:

```ts
const menuItems = [
  { id: "edit", label: "Edit" },
  { id: "duplicate", label: "Duplicate" },
  { id: "open-source", label: "Open source" },
  { id: "delete", label: "Delete", danger: true },
];
```

Hành vi:

```txt
Edit
→ mở composer/edit modal với dữ liệu entry

Duplicate
→ tạo entry mới dựa trên entry hiện tại

Open source
→ mở file Markdown và jump tới block id

Delete
→ confirm trước khi xóa
```

---

## 19. Thứ tự triển khai khuyến nghị

Nên làm theo thứ tự sau để thấy hiệu quả nhanh:

```txt
1. Rút gọn attachment path thành filename.
2. Chuyển action buttons sang menu ba chấm.
3. Giảm padding/margin timeline card.
4. Tạo compact/expanded mode cho card.
5. Ẩn audio player khi card collapsed.
6. Chuyển quick check-in thành collapsed composer.
7. Thu gọn filter panel.
8. Dùng CSS variables của Obsidian.
9. Đưa Open selected source ra khỏi composer.
10. Thêm Open today note ở header.
```

---

## 20. Checklist tổng hợp

### Layout

- [ ] Header gọn hơn.
- [ ] Timeline xuất hiện sớm hơn trong viewport.
- [ ] Quick check-in collapsed mặc định.
- [ ] Filter compact mặc định.
- [ ] Entry count nằm trước timeline list.

### Composer

- [ ] Có collapsed mode.
- [ ] Có expanded mode.
- [ ] Tự collapse sau khi tạo check-in.
- [ ] Attachment list chỉ hiện khi expanded.
- [ ] Xóa `Open selected source` khỏi composer.

### Filter

- [ ] Search input gọn.
- [ ] Date/tag/time control nằm cùng khu vực compact.
- [ ] Advanced filter chỉ mở khi cần.
- [ ] Time start/end không chiếm chỗ mặc định.

### Timeline card

- [ ] Card padding nhỏ hơn.
- [ ] Header dùng grid: time/title/menu.
- [ ] Action buttons chuyển thành menu.
- [ ] Body content căn theo title.
- [ ] Tag pill nhỏ.
- [ ] Card có collapsed/expanded state.

### Attachment

- [ ] Không hiển thị full path.
- [ ] Chỉ hiển thị basename.
- [ ] Filename dài dùng ellipsis.
- [ ] Full path nằm trong tooltip.
- [ ] Compact mode chỉ hiển thị summary.
- [ ] Expanded mode mới hiển thị preview.

### Audio

- [ ] Không render audio player trong collapsed card.
- [ ] Chỉ render audio khi expanded.
- [ ] Audio filename truncate.

### Theme

- [ ] Dùng `var(--text-normal)`.
- [ ] Dùng `var(--text-muted)`.
- [ ] Dùng `var(--text-accent)`.
- [ ] Dùng `var(--background-primary)`.
- [ ] Dùng `var(--background-secondary)`.
- [ ] Dùng `var(--background-modifier-border)`.
- [ ] Dùng `var(--interactive-normal)`.

---

## 21. Kết quả mong muốn

Sau khi refactor, UI nên có cảm giác như một Obsidian-native sidebar plugin:

```txt
Personal timeline                 Today

[Quick check-in...                    +]

[Search text, title, tags...           ]
[Today ▾] [Tags ▾] [Time ▾]

Today · 4 entries

12:57  Untitled check-in           ⋯
       Timeline
       📎 2 attachments

12:50  fef                         ⋯
       fefe
       #fef

12:44  fef                         ⋯
       aeàèwf

12:42  test                        ⋯
       fefe
```

Quan trọng nhất là:

- Timeline nhìn được nhiều entry hơn.
- Composer không chiếm hết màn hình.
- Filter không chiếm quá nhiều chiều cao.
- Attachment không làm vỡ layout.
- Action không gây rối card.
- UI hòa hợp với theme Obsidian.

---

## 22. Quyết định thiết kế cuối cùng

Các quyết định cần áp dụng trong lần tối ưu này:

```txt
Quick check-in:
- Collapsed by default.
- Expanded on click.

Filter:
- Compact by default.
- Advanced on demand.

Timeline card:
- Compact by default.
- Expanded on demand.
- Action buttons nằm trong menu ba chấm.

Attachment:
- Không hiển thị full path.
- Chỉ hiện filename hoặc summary.

Audio:
- Không hiện player mặc định.
- Chỉ hiện khi expanded.

Theme:
- Dùng CSS variables của Obsidian.
```

Đây là hướng giúp plugin phù hợp hơn với không gian sidebar của Obsidian, đặc biệt khi số lượng timeline entry tăng lên trong ngày.

