import { setIcon } from "obsidian";

import {
	removePendingAttachment,
} from "./composerAttachments";
import {
	getComposerTags,
	normalizeComposerContent,
	syncComposerTextareaHeight,
} from "./composerDraft";
import { renderComposerAttachmentActions } from "./renderComposerAttachmentActions";
import { renderComposerTags } from "./renderComposerTags";
import { renderPendingAttachments } from "./renderPendingAttachments";
import type {
	ComposerDraftState,
	ComposerFileTypeHint,
	ComposerRecordingState,
} from "./composerTypes";

interface RenderComposerPanelOptions {
	rootClassName: string;
	contentClassName?: string;
	contentPlaceholder: string;
	tagsPlaceholder: string;
	footerClassName?: string;
	attachmentToolsClassName?: string;
	cancelLabel: string;
	submitLabel: string;
	submitButtonClassName?: string;
	draftState: ComposerDraftState;
	recordingState: ComposerRecordingState;
	onDraftRefresh: () => void;
	onCommitTagDraft: () => boolean;
	onRemoveTag: (tag: string) => void;
	onAddFiles: (
		files: File[],
		typeHint: ComposerFileTypeHint,
	) => void | Promise<void>;
	onToggleRecording: () => void;
	onPaste?: (event: ClipboardEvent) => void | Promise<void>;
	onCancel: () => void;
	onSubmit: (submitButton: HTMLButtonElement) => void | Promise<void>;
	onSubmitShortcut?: () => void | Promise<void>;
}

export function renderComposerPanel(
	container: HTMLElement,
	options: RenderComposerPanelOptions,
): HTMLTextAreaElement {
	let isSubmitting = false;
	const composer = container.createDiv({ cls: options.rootClassName });
	const normalizedComposerContent = normalizeComposerContent(
		options.draftState.content,
	);
	if (!normalizedComposerContent && options.draftState.content) {
		options.draftState.content = "";
	}

	const contentInput = composer.createEl("textarea", {
		placeholder: options.contentPlaceholder,
		cls: options.contentClassName ?? "timeline-composer-content-input",
	});
	contentInput.value = normalizedComposerContent;
	syncComposerTextareaHeight(contentInput);
	contentInput.addEventListener("input", () => {
		options.draftState.content = contentInput.value;
		syncComposerTextareaHeight(contentInput);
	});
	if (options.onPaste) {
		contentInput.addEventListener("paste", (event) => {
			void options.onPaste?.(event);
		});
	}
	if (options.onSubmitShortcut) {
		contentInput.addEventListener("keydown", (event) => {
			if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
				event.preventDefault();
				void options.onSubmitShortcut?.();
			}
		});
	}

	renderComposerTags(composer, {
		tags: getComposerTags(options.draftState),
		draftValue: options.draftState.tagDraft,
		placeholder: options.tagsPlaceholder,
		onDraftChange: (value) => {
			options.draftState.tagDraft = value;
		},
		onCommitDraft: options.onCommitTagDraft,
		onRemoveTag: options.onRemoveTag,
		onRefresh: options.onDraftRefresh,
	});

	if (options.draftState.attachments.length > 0) {
		renderPendingAttachments(composer, {
			attachments: options.draftState.attachments,
			onRemove: (index) => {
				if (removePendingAttachment(options.draftState.attachments, index)) {
					options.onDraftRefresh();
				}
			},
		});
	}

	const footer = composer.createDiv({
		cls: options.footerClassName ?? "timeline-composer-footer",
	});
	renderComposerAttachmentActions(footer, {
		isRecording: options.recordingState.isRecording,
		toolsClassName: options.attachmentToolsClassName,
		onAddFiles: options.onAddFiles,
		onToggleRecording: options.onToggleRecording,
	});

	const actions = footer.createDiv({ cls: "timeline-composer-actions" });
	const cancelButton = actions.createEl("button", {
		text: options.cancelLabel,
		cls: "timeline-composer-secondary-button",
	});
	cancelButton.addEventListener("click", options.onCancel);

	const submitButton = actions.createEl("button", {
		text: options.submitLabel,
		cls: options.submitButtonClassName ?? "mod-cta timeline-composer-submit",
	});
	setIcon(submitButton, "send");
	submitButton.addEventListener("click", () => {
		if (isSubmitting) {
			return;
		}

		isSubmitting = true;
		submitButton.disabled = true;
		void Promise.resolve(options.onSubmit(submitButton)).finally(() => {
			isSubmitting = false;
			if (submitButton.isConnected) {
				submitButton.disabled = false;
			}
		});
	});

	return contentInput;
}
