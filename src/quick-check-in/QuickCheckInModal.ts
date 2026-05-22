import { Modal, Notice, setIcon } from "obsidian";

import type PersonalTimelinePlugin from "../main";
import { canCreateQuickCheckIn } from "../utils/tags";
import {
	appendPendingFiles,
	mapPendingAttachmentsToInputs,
	releasePendingAttachmentPreviews,
	removePendingAttachment,
} from "../views/timeline/composer/composerAttachments";
import {
	clearComposerDraft,
	commitComposerTagDraft,
	getComposerTags,
	removeComposerTag,
} from "../views/timeline/composer/composerDraft";
import {
	startComposerRecording,
	stopComposerRecording,
	stopComposerRecordingTracks,
} from "../views/timeline/composer/composerRecording";
import { renderComposerPanel } from "../views/timeline/composer/renderComposerPanel";
import type {
	ComposerDraftState,
	ComposerRecordingState,
} from "../views/timeline/composer/composerTypes";

interface QuickCheckInModalOptions {
	initialContent?: string;
}

export class QuickCheckInModal extends Modal {
	private readonly draftState: ComposerDraftState = {
		content: "",
		tagsValue: "",
		tagDraft: "",
		attachments: [],
	};
	private readonly recordingState: ComposerRecordingState = {
		mediaRecorder: null,
		audioChunks: [],
		isRecording: false,
	};
	private contentTextarea!: HTMLTextAreaElement;

	constructor(
		private readonly plugin: PersonalTimelinePlugin,
		options?: QuickCheckInModalOptions,
	) {
		super(plugin.app);
		this.draftState.content = options?.initialContent ?? "";
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("pt-checkin-modal");

		contentEl.createEl("h2", { text: "Quick check-in" });
		this.contentTextarea = renderComposerPanel(contentEl, {
			rootClassName: "pt-checkin-modal-body timeline-composer",
			contentClassName:
				"pt-checkin-modal-content timeline-composer-content-input",
			contentPlaceholder: "Hãy nhập",
			tagsPlaceholder: "# Add tags",
			footerClassName: "pt-checkin-modal-footer timeline-composer-footer",
			attachmentToolsClassName:
				"pt-checkin-modal-actions timeline-composer-tools",
			cancelLabel: "Cancel",
			submitLabel: "Create",
			draftState: this.draftState,
			recordingState: this.recordingState,
			onDraftRefresh: () => {
				this.redraw();
			},
			onCommitTagDraft: () => this.commitTagDraft(),
			onRemoveTag: (tag) => {
				this.removeTag(tag);
			},
			onAddFiles: async (files, typeHint) => {
				await this.addPendingFiles(files, typeHint);
			},
			onToggleRecording: () => {
				if (this.recordingState.isRecording) {
					this.stopRecording();
					return;
				}

				void this.startRecording();
			},
			onCancel: () => {
				this.close();
			},
			onSubmit: async () => {
				await this.submit();
			},
			onSubmitShortcut: async () => {
				await this.submit();
			},
		});

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
		clearComposerDraft(this.draftState);
		this.contentEl.empty();
	}

	private async submit(): Promise<void> {
		const content = this.draftState.content.trim();
		this.commitTagDraft();
		const tags = this.getTags();
		if (!canCreateQuickCheckIn(content, tags, this.draftState.attachments)) {
			new Notice("Nothing to save.");
			return;
		}

		await this.plugin.createQuickCheckIn({
			content,
			tags,
			attachments: mapPendingAttachmentsToInputs(this.draftState.attachments),
			source: "quick-capture",
		});
		new Notice("Timeline check-in created.");
		this.close();
	}

	private async addPendingFiles(files: File[], typeHint: "image" | "file"): Promise<void> {
		await appendPendingFiles(this.draftState.attachments, files, typeHint);
		this.redraw();
	}

	private async startRecording(): Promise<void> {
		await startComposerRecording({
			state: this.recordingState,
			onUnsupported: () => {
				new Notice("Audio recording is not supported in this environment.");
			},
			onError: () => {
				new Notice("Unable to start audio recording.");
			},
			onReady: async (file, stream) => {
				await this.finishRecording(file, stream);
			},
			onStateChanged: async () => {
				this.redraw();
			},
		});
	}

	private stopRecording(): void {
		stopComposerRecording(this.recordingState);
	}

	private async finishRecording(file: File, stream: MediaStream): Promise<void> {
		await appendPendingFiles(this.draftState.attachments, [file], "audio");
		stream.getTracks().forEach((track) => track.stop());
		this.recordingState.mediaRecorder = null;
		this.recordingState.audioChunks = [];
		this.recordingState.isRecording = false;
		this.redraw();
	}

	private stopRecordingTracks(): void {
		stopComposerRecordingTracks(this.recordingState);
	}

	private releasePreviewUrls(): void {
		releasePendingAttachmentPreviews(this.draftState.attachments);
	}

	private getTags(): string[] {
		return getComposerTags(this.draftState);
	}

	private commitTagDraft(): boolean {
		return commitComposerTagDraft(this.draftState);
	}

	private removeTag(tagToRemove: string): void {
		removeComposerTag(this.draftState, tagToRemove);
	}

	private redraw(): void {
		this.onOpen();
	}
}
