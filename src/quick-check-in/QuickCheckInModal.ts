import { Modal, Notice, setIcon } from "obsidian";

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
	private tagsDraft = "";
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
			attr: { placeholder: "Write your note or type # to add tags..." },
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

		this.renderAttachments(contentEl);
		this.renderTags(contentEl);
		this.renderAttachmentActions(contentEl);
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
		const imageButton = row.createEl("button", {
			cls: "timeline-icon-button",
			attr: { "aria-label": "Add image", type: "button" },
		});
		setIcon(imageButton, "image");
		const fileButton = row.createEl("button", {
			cls: "timeline-icon-button",
			attr: { "aria-label": "Add file", type: "button" },
		});
		setIcon(fileButton, "paperclip");
		const audioButton = row.createEl("button", {
			cls: `timeline-icon-button${this.isRecording ? " is-recording" : ""}`,
			attr: {
				"aria-label": this.isRecording ? "Stop recording" : "Record audio",
				type: "button",
			},
		});
		setIcon(audioButton, this.isRecording ? "square" : "mic");

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

	private renderTags(container: HTMLElement): void {
		const tagsRow = container.createDiv({ cls: "timeline-composer-tags-row" });
		const tags = this.getTags();
		if (tags.length > 0) {
			const tagsList = tagsRow.createDiv({ cls: "timeline-composer-tag-list" });
			for (const tag of tags) {
				const chip = tagsList.createDiv({ cls: "timeline-tag-chip" });
				chip.createSpan({
					cls: "timeline-tag-chip-label",
					text: `#${tag}`,
				});
				const removeButton = chip.createEl("button", {
					cls: "timeline-tag-chip-remove",
					attr: { "aria-label": `Remove #${tag}` },
				});
				setIcon(removeButton, "x");
				removeButton.addEventListener("click", () => {
					this.removeTag(tag);
					this.redraw();
				});
			}
		}

		const tagsInput = tagsRow.createEl("input", {
			type: "text",
			placeholder: tags.length > 0 ? "# Add tag" : "# Add tags",
		});
		tagsInput.addClass("timeline-composer-tag-input");
		tagsInput.value = this.tagsDraft;
		tagsInput.addEventListener("input", () => {
			this.tagsDraft = tagsInput.value;
			if (/[,\s]$/.test(this.tagsDraft)) {
				this.commitTagDraft();
				this.redraw();
			}
		});
		tagsInput.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === ",") {
				event.preventDefault();
				if (this.commitTagDraft()) {
					this.redraw();
				}
				return;
			}

			if (event.key === "Backspace" && !tagsInput.value) {
				const currentTags = this.getTags();
				const lastTag = currentTags[currentTags.length - 1];
				if (lastTag) {
					this.removeTag(lastTag);
					this.redraw();
				}
			}
		});
	}

	private renderAttachments(container: HTMLElement): void {
		if (this.attachments.length === 0) {
			return;
		}

		const section = container.createDiv({ cls: "timeline-pending-section" });
		const imageRow = section.createDiv({ cls: "timeline-pending-list timeline-pending-images" });
		const fileRow = section.createDiv({ cls: "timeline-pending-list timeline-pending-files" });
		const audioRow = section.createDiv({ cls: "timeline-pending-list timeline-pending-audios" });

		this.attachments.forEach((attachment, index) => {
			const parent =
				attachment.type === "image"
					? imageRow
					: attachment.type === "file"
						? fileRow
						: audioRow;
			const card = parent.createDiv({
				cls: `timeline-pending-card ${getModalAttachmentCardClass(attachment)}`,
			});

			if (attachment.type === "image" && attachment.previewUrl) {
				card.createEl("img", {
					cls: "timeline-attachment-image",
					attr: { src: attachment.previewUrl, alt: attachment.name },
				});
			} else if (attachment.type === "audio") {
				const audioSummary = card.createDiv({ cls: "timeline-pending-audio-row" });
				audioSummary.createDiv({ cls: "timeline-pending-audio-dot" });
				audioSummary.createEl("strong", {
					cls: "timeline-pending-audio-title",
					text: "Recording",
				});
				audioSummary.createEl("span", {
					cls: "timeline-pending-audio-meta",
					text: formatModalAttachmentSize(attachment.data.byteLength),
				});
			} else if (attachment.type === "file") {
				const fileSummary = card.createDiv({ cls: "timeline-pending-file-row" });
				const fileIcon = fileSummary.createDiv({ cls: "timeline-pending-file-icon" });
				setIcon(fileIcon, "file-down");
				const fileBody = fileSummary.createDiv({ cls: "timeline-pending-file-body" });
				fileBody.createEl("strong", {
					cls: "timeline-pending-file-name",
					text: attachment.name,
				});
				fileBody.createEl("div", {
					cls: "timeline-pending-file-size",
					text: formatModalAttachmentSize(attachment.data.byteLength),
				});
			}

			const removeButton = card.createEl("button", {
				cls: "timeline-pending-remove",
				attr: { "aria-label": `Remove ${attachment.name}` },
			});
			setIcon(removeButton, "x");
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
		const cancelButton = footer.createEl("button", {
			text: "Cancel",
			cls: "timeline-composer-secondary-button",
		});
		const createButton = footer.createEl("button", {
			cls: "mod-cta timeline-composer-submit",
			text: "Create",
		});
		setIcon(createButton, "send");

		cancelButton.addEventListener("click", () => this.close());
		createButton.addEventListener("click", () => {
			void this.submit();
		});
	}

	private async submit(): Promise<void> {
		const content = this.content.trim();
		this.commitTagDraft();
		const tags = this.getTags();
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

	private getTags(): string[] {
		return parseTags([this.tagsInput, this.tagsDraft].filter(Boolean).join(" "));
	}

	private commitTagDraft(): boolean {
		const parsedDraft = parseTags(this.tagsDraft);
		if (parsedDraft.length === 0) {
			this.tagsDraft = "";
			return false;
		}

		this.tagsInput = parseTags([this.tagsInput, parsedDraft.join(" ")].filter(Boolean).join(" ")).join(", ");
		this.tagsDraft = "";
		return true;
	}

	private removeTag(tagToRemove: string): void {
		this.tagsInput = this.getTags()
			.filter((tag) => tag !== tagToRemove)
			.join(", ");
	}

	private redraw(): void {
		this.onOpen();
	}
}

function getModalAttachmentCardClass(attachment: PendingQuickAttachment): string {
	switch (attachment.type) {
		case "image":
			return "is-image";
		case "audio":
			return "is-audio";
		case "file":
			return "is-file";
		default:
			return "";
	}
}

function formatModalAttachmentSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}

	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}

	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
