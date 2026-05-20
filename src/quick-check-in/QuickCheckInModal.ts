import { Modal, Notice } from "obsidian";

import type PersonalTimelinePlugin from "../main";
import {
	createPendingAttachmentFromFile,
	getAudioExtension,
	type PendingQuickAttachment,
	revokePreview,
} from "./pendingAttachments";
import { canCreateQuickCheckIn, parseTags } from "../utils/tags";

interface QuickCheckInModalOptions {
	initialContent?: string;
}

export class QuickCheckInModal extends Modal {
	private content = "";
	private tagsInput = "";
	private attachments: PendingQuickAttachment[] = [];
	private isRecording = false;
	private mediaRecorder: MediaRecorder | null = null;
	private audioChunks: Blob[] = [];
	private contentTextarea!: HTMLTextAreaElement;

	constructor(
		private readonly plugin: PersonalTimelinePlugin,
		options?: QuickCheckInModalOptions,
	) {
		super(plugin.app);
		this.content = options?.initialContent ?? "";
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("pt-checkin-modal");

		contentEl.createEl("h2", { text: "Quick check-in" });

		this.contentTextarea = contentEl.createEl("textarea", {
			cls: "pt-checkin-modal-content",
			attr: { placeholder: "What happened?" },
		});
		this.contentTextarea.value = this.content;
		this.contentTextarea.addEventListener("input", () => {
			this.content = this.contentTextarea.value;
		});
		this.contentTextarea.addEventListener("keydown", (event) => {
			if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
				event.preventDefault();
				void this.submit();
			}
		});

		const tagsInput = contentEl.createEl("input", {
			cls: "pt-checkin-modal-tags",
			attr: {
				type: "text",
				placeholder: "#tags",
			},
		});
		tagsInput.value = this.tagsInput;
		tagsInput.addEventListener("input", () => {
			this.tagsInput = tagsInput.value;
		});

		this.renderAttachmentActions(contentEl);
		this.renderAttachments(contentEl);
		this.renderFooter(contentEl);

		window.setTimeout(() => {
			this.contentTextarea.focus();
			if (this.contentTextarea.value.length > 0) {
				this.contentTextarea.setSelectionRange(this.contentTextarea.value.length, this.contentTextarea.value.length);
			}
		}, 0);
	}

	onClose(): void {
		this.stopRecordingTracks();
		this.releasePreviewUrls();
		this.attachments = [];
		this.contentEl.empty();
	}

	private renderAttachmentActions(container: HTMLElement): void {
		const row = container.createDiv({ cls: "pt-checkin-modal-actions" });
		const imageButton = row.createEl("button", { text: "Add image" });
		const fileButton = row.createEl("button", { text: "Add file" });
		const audioButton = row.createEl("button", {
			text: this.isRecording ? "Stop recording" : "Record audio",
		});

		const imageInput = container.createEl("input", {
			type: "file",
		});
		imageInput.accept = "image/*";
		imageInput.multiple = true;
		imageInput.addClass("timeline-hidden-input");

		const fileInput = container.createEl("input", {
			type: "file",
		});
		fileInput.multiple = true;
		fileInput.addClass("timeline-hidden-input");

		imageButton.addEventListener("click", () => imageInput.click());
		fileButton.addEventListener("click", () => fileInput.click());
		audioButton.addEventListener("click", () => {
			if (this.isRecording) {
				this.stopRecording();
				return;
			}

			void this.startRecording();
		});

		imageInput.addEventListener("change", () => {
			if (imageInput.files) {
				void this.addPendingFiles(Array.from(imageInput.files), "image");
				imageInput.value = "";
			}
		});

		fileInput.addEventListener("change", () => {
			if (fileInput.files) {
				void this.addPendingFiles(Array.from(fileInput.files), "file");
				fileInput.value = "";
			}
		});
	}

	private renderAttachments(container: HTMLElement): void {
		if (this.attachments.length === 0) {
			return;
		}

		const section = container.createDiv({ cls: "timeline-pending-section" });
		const header = section.createDiv({ cls: "timeline-pending-header" });
		header.createEl("div", {
			cls: "timeline-pending-title",
			text: `📎 ${this.attachments.length} attachment${this.attachments.length === 1 ? "" : "s"}`,
		});
		const clearButton = header.createEl("button", { text: "Clear" });
		clearButton.addEventListener("click", () => {
			this.releasePreviewUrls();
			this.attachments = [];
			this.redraw();
		});

		const list = section.createDiv({ cls: "timeline-pending-list" });
		this.attachments.forEach((attachment, index) => {
			const card = list.createDiv({ cls: "timeline-pending-card" });
			card.createEl("strong", { text: attachment.name });
			card.createEl("div", {
				cls: "timeline-pending-meta",
				text: `${attachment.type}${attachment.mime ? ` • ${attachment.mime}` : ""}`,
			});

			if (attachment.type === "image" && attachment.previewUrl) {
				card.createEl("img", {
					cls: "timeline-attachment-image",
					attr: { src: attachment.previewUrl, alt: attachment.name },
				});
			}

			if (attachment.type === "audio" && attachment.previewUrl) {
				const audio = card.createEl("audio", { cls: "timeline-attachment-audio" });
				audio.controls = true;
				audio.src = attachment.previewUrl;
			}

			const removeButton = card.createEl("button", { text: "Remove" });
			removeButton.addEventListener("click", () => {
				const target = this.attachments[index];
				if (!target) {
					return;
				}

				revokePreview(target);
				this.attachments.splice(index, 1);
				this.redraw();
			});
		});
	}

	private renderFooter(container: HTMLElement): void {
		const footer = container.createDiv({ cls: "pt-checkin-modal-footer" });
		const cancelButton = footer.createEl("button", { text: "Cancel" });
		const createButton = footer.createEl("button", {
			cls: "mod-cta",
			text: "Create",
		});

		cancelButton.addEventListener("click", () => this.close());
		createButton.addEventListener("click", () => {
			void this.submit();
		});
	}

	private async submit(): Promise<void> {
		const content = this.content.trim();
		const tags = parseTags(this.tagsInput);
		if (!canCreateQuickCheckIn(content, tags, this.attachments)) {
			new Notice("Nothing to save.");
			return;
		}

		await this.plugin.createQuickCheckIn({
			content,
			tags,
			attachments: this.attachments.map((attachment) => ({
				type: attachment.type,
				name: attachment.name,
				mime: attachment.mime,
				data: attachment.data,
			})),
			source: "quick-capture",
		});
		new Notice("Timeline check-in created.");
		this.close();
	}

	private async addPendingFiles(files: File[], typeHint: "image" | "file"): Promise<void> {
		for (const file of files) {
			this.attachments.push(await createPendingAttachmentFromFile(file, typeHint));
		}
		this.redraw();
	}

	private async startRecording(): Promise<void> {
		if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
			new Notice("Audio recording is not supported in this environment.");
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			this.audioChunks = [];
			this.mediaRecorder = new MediaRecorder(stream);
			this.isRecording = true;
			this.mediaRecorder.addEventListener("dataavailable", (event) => {
				if (event.data.size > 0) {
					this.audioChunks.push(event.data);
				}
			});
			this.mediaRecorder.addEventListener("stop", () => {
				const blob = new Blob(this.audioChunks, {
					type: this.mediaRecorder?.mimeType || "audio/webm",
				});
				const extension = getAudioExtension(blob.type);
				const file = new File([blob], `recording-${Date.now()}${extension}`, {
					type: blob.type,
				});
				void this.finishRecording(file, stream);
			});
			this.mediaRecorder.start();
			this.redraw();
		} catch {
			this.isRecording = false;
			new Notice("Unable to start audio recording.");
		}
	}

	private stopRecording(): void {
		if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
			return;
		}

		this.mediaRecorder.stop();
	}

	private async finishRecording(file: File, stream: MediaStream): Promise<void> {
		this.attachments.push(await createPendingAttachmentFromFile(file, "audio"));
		stream.getTracks().forEach((track) => track.stop());
		this.mediaRecorder = null;
		this.audioChunks = [];
		this.isRecording = false;
		this.redraw();
	}

	private stopRecordingTracks(): void {
		if (!this.mediaRecorder) {
			return;
		}

		if (this.mediaRecorder.state !== "inactive") {
			this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
		}
		this.mediaRecorder = null;
		this.audioChunks = [];
		this.isRecording = false;
	}

	private releasePreviewUrls(): void {
		for (const attachment of this.attachments) {
			revokePreview(attachment);
		}
	}

	private redraw(): void {
		this.onOpen();
	}
}
