Bạn nên thêm chức năng này bằng **Obsidian command + hotkey**, khi chạy command sẽ mở một **Modal tạo quick check-in**. Đây là hướng phù hợp nhất vì Obsidian cho phép user tự gán phím tắt cho command trong Settings → Hotkeys.

## Thiết kế đề xuất

Command:

```txt
Personal Timeline: Create quick check-in
```

Luồng:

```txt
User bấm hotkey
→ Mở modal nhỏ
→ Focus vào content textarea
→ User nhập nội dung
→ Optional: tags, image/file/audio
→ Enter/Cmd+Enter để lưu
→ Plugin tạo timeline entry
→ Modal đóng
```

UI modal nên tối giản vì bạn đã bỏ `title`:

```txt
Quick check-in

[What happened?                  ]

[#tags                           ]

[🖼 Image] [📎 File] [🎙 Audio]

📎 2 attachments

[Cancel] [Create]
```

Không có `Title`.

---

# 1. Đăng ký command để gán hotkey

Trong `onload()`:

```ts
async onload() {
  await this.loadSettings();

  this.addCommand({
    id: "create-quick-check-in",
    name: "Create quick check-in",
    callback: () => {
      new QuickCheckInModal(this.app, this).open();
    },
  });
}
```

Sau đó user có thể vào:

```txt
Settings → Hotkeys → search "Create quick check-in"
```

và gán phím tắt, ví dụ:

```txt
Ctrl/Cmd + Shift + T
```

---

# 2. Tạo QuickCheckInModal

```ts
import {
  App,
  Modal,
  Notice,
  Setting,
} from "obsidian";

export class QuickCheckInModal extends Modal {
  plugin: PersonalTimelinePlugin;

  content = "";
  tagsInput = "";
  attachments: TimelineAttachment[] = [];
  isRecording = false;

  contentTextarea!: HTMLTextAreaElement;
  tagsInputEl!: HTMLInputElement;

  constructor(app: App, plugin: PersonalTimelinePlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("pt-checkin-modal");

    contentEl.createEl("h2", {
      text: "Quick check-in",
    });

    this.contentTextarea = contentEl.createEl("textarea", {
      cls: "pt-checkin-modal-content",
      attr: {
        placeholder: "What happened?",
      },
    });

    this.contentTextarea.addEventListener("input", () => {
      this.content = this.contentTextarea.value;
    });

    this.tagsInputEl = contentEl.createEl("input", {
      cls: "pt-checkin-modal-tags",
      attr: {
        placeholder: "#tags",
      },
    });

    this.tagsInputEl.addEventListener("input", () => {
      this.tagsInput = this.tagsInputEl.value;
    });

    this.renderAttachmentActions(contentEl);
    this.renderFooter(contentEl);

    setTimeout(() => {
      this.contentTextarea.focus();
    }, 0);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  renderAttachmentActions(container: HTMLElement) {
    const row = container.createDiv({
      cls: "pt-checkin-modal-actions",
    });

    const imageButton = row.createEl("button", {
      text: "🖼 Image",
    });

    imageButton.addEventListener("click", async () => {
      await this.addImage();
    });

    const fileButton = row.createEl("button", {
      text: "📎 File",
    });

    fileButton.addEventListener("click", async () => {
      await this.addFile();
    });

    const audioButton = row.createEl("button", {
      text: "🎙 Audio",
    });

    audioButton.addEventListener("click", async () => {
      await this.recordAudio();
    });
  }

  renderFooter(container: HTMLElement) {
    const footer = container.createDiv({
      cls: "pt-checkin-modal-footer",
    });

    const cancelButton = footer.createEl("button", {
      text: "Cancel",
    });

    cancelButton.addEventListener("click", () => {
      this.close();
    });

    const createButton = footer.createEl("button", {
      cls: "mod-cta",
      text: "Create",
    });

    createButton.addEventListener("click", async () => {
      await this.submit();
    });

    this.contentTextarea.addEventListener("keydown", async (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        await this.submit();
      }
    });
  }

  async submit() {
    const content = this.content.trim();
    const tags = parseTags(this.tagsInput);

    if (!canCreateQuickCheckIn(content, tags, this.attachments)) {
      new Notice("Nothing to save");
      return;
    }

    await this.plugin.createQuickCheckIn({
      content,
      tags,
      attachments: this.attachments,
      source: "quick-capture",
    });

    new Notice("Timeline check-in created");
    this.close();
  }

  async addImage() {
    // Implement sau: mở file picker / paste / attachment flow.
    new Notice("Add image is not implemented yet");
  }

  async addFile() {
    // Implement sau: mở file picker / copy file vào attachment folder.
    new Notice("Add file is not implemented yet");
  }

  async recordAudio() {
    // Implement sau: MediaRecorder flow.
    new Notice("Record audio is not implemented yet");
  }
}
```

---

# 3. Tạo service chung `createQuickCheckIn`

Nên đưa logic tạo timeline ra service chung để dùng lại cho:

```txt
- Sidebar quick composer
- Hotkey modal
- Command palette
- Future mobile action
```

Interface:

```ts
interface CreateQuickCheckInInput {
  content: string;
  tags: string[];
  attachments: TimelineAttachment[];
  source: "quick-capture" | "manual" | "imported";
}
```

Plugin method:

```ts
async createQuickCheckIn(input: CreateQuickCheckInInput) {
  const now = new Date();

  const date = formatDate(now);
  const time = formatTime(now);
  const nowIso = now.toISOString();
  const id = createTimelineEntryId(now);

  const meta: TimelineEntryMeta = {
    schemaVersion: 1,
    id,
    type: detectEntryType(input.content, input.attachments),
    date,
    time,
    createdAt: nowIso,
    updatedAt: nowIso,
    tags: input.tags,
    source: input.source,
    attachments: input.attachments,
  };

  const markdown = createTimelineEntryBlock(
    meta,
    input.content,
    input.attachments
  );

  await this.appendEntryToTimelineDay(date, markdown);
  await this.refreshTimelineViews?.();
}
```

---

# 4. Markdown output vẫn không có title

Khi tạo bằng hotkey modal, output vẫn theo format mới:

```md
## 14:20 ^tl-20260520-142000-a1b2

<!-- timeline-entry
{
  "schemaVersion": 1,
  "id": "tl-20260520-142000-a1b2",
  "type": "checkin",
  "date": "2026-05-20",
  "time": "14:20",
  "createdAt": "2026-05-20T14:20:00+07:00",
  "updatedAt": "2026-05-20T14:20:00+07:00",
  "tags": ["idea"],
  "source": "quick-capture",
  "attachments": []
}
-->

Ý tưởng mới cho plugin.
```

---

# 5. CSS cho modal

```css
.pt-checkin-modal {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pt-checkin-modal h2 {
  margin: 0 0 4px;
}

.pt-checkin-modal-content {
  width: 100%;
  min-height: 120px;
  max-height: 280px;
  resize: vertical;
}

.pt-checkin-modal-tags {
  width: 100%;
}

.pt-checkin-modal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pt-checkin-modal-actions button {
  min-height: 32px;
}

.pt-checkin-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
```

---

# 6. Nâng cấp UX nên có

## Cmd/Ctrl + Enter để tạo

Trong modal, nên hỗ trợ:

```txt
Cmd/Ctrl + Enter → Create
Esc → Close
```

Esc mặc định Modal đã hỗ trợ đóng.

## Focus tự động vào content

Khi mở modal từ hotkey, phải focus ngay vào textarea để user gõ luôn.

## Nếu đang có selected text trong editor

Có thể lấy text đang chọn làm content mặc định:

```ts
const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
const selectedText = markdownView?.editor?.getSelection();

new QuickCheckInModal(this.app, this, {
  initialContent: selectedText ?? "",
}).open();
```

Modal constructor:

```ts
constructor(
  app: App,
  plugin: PersonalTimelinePlugin,
  options?: { initialContent?: string }
) {
  super(app);
  this.plugin = plugin;
  this.content = options?.initialContent ?? "";
}
```

Khi render textarea:

```ts
this.contentTextarea.value = this.content;
```

Đây là UX rất hữu ích: bôi đen đoạn text trong note → bấm hotkey → modal mở sẵn nội dung đó → Create.

---

# 7. Command nâng cao nên thêm

Bạn có thể thêm 2 command:

```ts
this.addCommand({
  id: "create-quick-check-in",
  name: "Create quick check-in",
  callback: () => {
    new QuickCheckInModal(this.app, this).open();
  },
});

this.addCommand({
  id: "create-quick-check-in-from-selection",
  name: "Create quick check-in from selection",
  editorCallback: (editor) => {
    const selectedText = editor.getSelection();

    new QuickCheckInModal(this.app, this, {
      initialContent: selectedText,
    }).open();
  },
});
```

Trong Obsidian, `editorCallback` giúp command hoạt động khi đang ở editor.

---

# 8. Checklist thực hiện

```txt
1. Tạo QuickCheckInModal.ts
2. Thêm command trong onload()
3. Cho user gán hotkey trong Settings → Hotkeys
4. Tách createQuickCheckIn thành service/method dùng chung
5. Modal không có title input
6. Modal có content, tags, attachment buttons, create/cancel
7. Hỗ trợ Cmd/Ctrl + Enter để tạo
8. Auto focus vào textarea
9. Optional: command tạo check-in từ selected text
10. CSS modal gọn theo Obsidian theme
```

---

# 9. Kết luận

Phương án tốt nhất:

```txt
Hotkey không tạo entry ngay
Hotkey mở QuickCheckInModal
Modal không có Title
Modal dùng quick mode
Create gọi chung createQuickCheckIn()
```

Như vậy plugin có 2 cách nhập nhanh dùng chung một logic:

```txt
Sidebar quick composer
Hotkey modal
```

và dữ liệu lưu ra Markdown vẫn thống nhất theo format không có title.
