# Personal Timeline Plugin Sprint Checklist

## Mục tiêu

Tài liệu này dùng để theo dõi tiến độ phát triển plugin Obsidian "Personal Timeline Check-in" theo từng sprint, bám theo spec trong `obsidian_personal_timeline_plugin_spec.md`.

Trạng thái:
- `[ ]` Chưa làm
- `[~]` Đang làm
- `[x]` Hoàn thành
- `[-]` Tạm hoãn

## Sprint 1 - Nền tảng plugin và data model

Mục tiêu:
- Thay scaffold sample plugin bằng cấu trúc plugin thật.
- Chuẩn hóa settings, models, paths, và khung lưu trữ.

Checklist:
- [x] Cập nhật `manifest.json` với `id`, `name`, `description`, `author`.
- [x] Thu gọn `src/main.ts` để chỉ giữ lifecycle và đăng ký thành phần plugin.
- [x] Tách `src/settings.ts` thành module settings rõ ràng hơn.
- [x] Tạo cấu trúc thư mục mới trong `src/`:
  - [x] `models/`
  - [x] `settings/`
  - [x] `storage/`
  - [x] `parser/`
  - [x] `index/`
  - [x] `views/`
  - [x] `utils/`
- [x] Khai báo `TimelinePluginSettings`.
- [x] Khai báo `TimelineDayProperties`.
- [x] Khai báo `TimelineEntryMeta`.
- [x] Khai báo `TimelineAttachment`.
- [x] Khai báo `ParsedTimelineEntry`.
- [x] Khai báo `TimelineIndexItem`.
- [x] Thêm default settings:
  - [x] `timelineFolder`
  - [x] `attachmentFolder`
  - [x] `fileOrganization`
  - [x] `defaultView`
  - [x] `timeFormat`
- [x] Tạo settings tab để chỉnh các cấu hình cơ bản.

## Sprint 2 - Storage layer và MVP text timeline

Mục tiêu:
- Tạo được check-in dạng text và lưu vào Markdown theo ngày.
- Hiển thị timeline hôm nay trong right sidebar view.

Checklist:
- [x] Tạo hằng số `VIEW_TYPE_TIMELINE`.
- [x] Tạo custom `ItemView` cho right sidebar.
- [x] Tạo command mở timeline view.
- [x] Tạo ribbon action để mở timeline view.
- [x] Triển khai `ensureNestedFolder`.
- [x] Triển khai `getTimelineFilePath`.
- [x] Triển khai `getAttachmentPath`.
- [x] Triển khai `createTimelineDayTemplate`.
- [x] Triển khai `createTimelineEntryBlock`.
- [x] Tạo helper sinh `entryId` theo format `tl-YYYYMMDD-HHmmss-random`.
- [x] Tạo helper sinh timestamp/date/time phục vụ lưu file.
- [x] Tự tạo file timeline ngày nếu chưa tồn tại.
- [x] Append text check-in vào file timeline.
- [x] Cập nhật frontmatter:
  - [x] `entry_count`
  - [x] `created_at`
  - [x] `updated_at`
- [x] Tạo `CheckInComposer` cho text input cơ bản.
- [x] Hiển thị danh sách entry của ngày hiện tại.
- [x] Render tối thiểu:
  - [x] Giờ check-in
  - [x] Title
  - [x] Preview nội dung
  - [x] Tags
- [x] Thêm action `Open source`.
- [x] Kiểm tra reload plugin vẫn đọc lại được dữ liệu đã lưu.

## Sprint 3 - Parser, index, search và filter

Mục tiêu:
- Parse được dữ liệu từ Markdown.
- Tìm kiếm và lọc nhanh bằng in-memory index.

Checklist:
- [x] Triển khai regex parse hidden JSON comment.
- [x] Triển khai `isValidTimelineEntryMeta`.
- [x] Triển khai `parseTimelineEntryMetas`.
- [x] Triển khai `parseTimelineEntries`.
- [x] Đảm bảo plugin không crash khi JSON hỏng.
- [x] Build index từ timeline folder.
- [x] Tạo `TimelineIndexItem` từ parsed entries.
- [x] Thêm watch vault changes để refresh index khi file đổi.
- [x] Thêm search theo text/title.
- [x] Thêm filter theo tag.
- [x] Thêm filter theo time range.
- [x] Thêm filter theo date:
  - [x] today
  - [x] yesterday
  - [x] this week
  - [x] custom day
- [x] Thêm UI toolbar:
  - [x] Search input
  - [x] Tag filter
  - [x] Time range filter
  - [x] Date selector
- [x] Sắp xếp entry theo thời gian hợp lý trong ngày.

## Sprint 4 - Attachments

Mục tiêu:
- Hỗ trợ image, file, audio theo hướng local-first.

Checklist:
- [x] Tạo luồng thêm image attachment.
- [x] Tạo luồng thêm file attachment.
- [x] Tạo luồng audio recording.
- [x] Tạo helper sinh `attachmentId` theo format `att-YYYYMMDD-HHmmss-index`.
- [x] Copy hoặc tạo attachment vào thư mục lưu trữ đúng cấu trúc.
- [x] Ghi metadata attachment vào hidden JSON.
- [x] Chèn wikilink/embed vào markdown body.
- [x] Hiển thị preview cho image.
- [x] Hiển thị preview hoặc link cho audio.
- [x] Hiển thị preview hoặc link cho file thường.
- [x] Xử lý an toàn nếu attachment bị thiếu hoặc path không còn tồn tại.
- [ ] Kiểm tra khả năng hoạt động trên mobile nếu giữ `isDesktopOnly: false`.

## Sprint 5 - Edit, delete và đồng bộ dữ liệu

Mục tiêu:
- Cho phép sửa và xóa entry an toàn, không làm hỏng Markdown nguồn.

Checklist:
- [x] Triển khai `updateEntryMetaInBlock`.
- [x] Triển khai `replaceEntryBlock`.
- [x] Tạo UI edit entry.
- [x] Cho phép sửa:
  - [x] title
  - [x] time
  - [x] markdown content
  - [x] tags
- [x] Đồng bộ heading khi title/time đổi.
- [x] Đồng bộ hidden JSON khi metadata đổi.
- [x] Cập nhật lại index sau edit.
- [x] Tạo action delete entry.
- [x] Xóa block entry khỏi file markdown.
- [x] Cập nhật frontmatter sau delete.
- [x] Thêm confirm trước khi delete nếu cần.
- [x] Chưa tự động xóa attachment khi delete entry.
- [x] Tạo action duplicate entry.
- [x] Hiển thị warning hoặc bỏ qua entry có JSON lỗi.

## Sprint 6 - Hoàn thiện UX, hiệu năng và phát hành

Mục tiêu:
- Làm plugin ổn định hơn cho sử dụng thực tế.

Checklist:
- [x] Debounce search input.
- [x] Cache parse result để giảm đọc file lặp lại.
- [x] Tối ưu render danh sách timeline dài.
- [x] Kiểm tra cleanup listener, interval, view lifecycle.
- [ ] Kiểm tra trải nghiệm mobile.
- [x] Soát lại copy trong UI theo sentence case.
- [x] Soát lại command IDs để đảm bảo ổn định.
- [x] Cập nhật `README.md`.
- [x] Đồng bộ `version` trong `manifest.json` và `versions.json`.
- [x] Chạy `npm run build`.
- [x] Chạy `npm run lint`.
- [ ] Kiểm tra manual install trong vault:
  - [ ] `main.js`
  - [ ] `manifest.json`
  - [ ] `styles.css`

## Cột mốc phát hành

- [x] MVP nội bộ: text timeline dùng được hằng ngày.
- [x] Beta nội bộ: search/filter ổn định.
- [x] Beta attachment: image/file/audio hoạt động.
- [x] Release candidate: edit/delete ổn định, không lỗi parse nghiêm trọng.
- [ ] v1.0.0: đủ ổn định để dùng lâu dài trong vault cá nhân.

## Ghi chú

- Source of truth:
  - Markdown body cho nội dung entry
  - Hidden JSON comment cho metadata entry
  - Frontmatter cho metadata cấp file ngày
  - In-memory index chỉ là cache
- Không lưu attachment dưới dạng base64.
- Không scan toàn vault mỗi lần search.
- Không để plugin crash khi entry có JSON lỗi.
