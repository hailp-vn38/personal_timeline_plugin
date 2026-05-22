import { setIcon } from "obsidian";

import type { ComposerFileTypeHint } from "./composerTypes";

interface RenderComposerAttachmentActionsOptions {
	isRecording: boolean;
	toolsClassName?: string;
	onAddFiles: (
		files: File[],
		typeHint: ComposerFileTypeHint,
	) => void | Promise<void>;
	onToggleRecording: () => void;
}

export function renderComposerAttachmentActions(
	container: HTMLElement,
	options: RenderComposerAttachmentActionsOptions,
): void {
	const tools = container.createDiv({
		cls: options.toolsClassName ?? "timeline-composer-tools",
	});
	const addImageButton = tools.createEl("button", {
		cls: "timeline-icon-button",
		attr: { "aria-label": "Add image", type: "button" },
	});
	setIcon(addImageButton, "image");
	const addFileButton = tools.createEl("button", {
		cls: "timeline-icon-button",
		attr: { "aria-label": "Add file", type: "button" },
	});
	setIcon(addFileButton, "paperclip");
	const recordAudioButton = tools.createEl("button", {
		cls: `timeline-icon-button${options.isRecording ? " is-recording" : ""}`,
		attr: {
			"aria-label": options.isRecording
				? "Stop recording"
				: "Record audio",
			type: "button",
		},
	});
	setIcon(recordAudioButton, options.isRecording ? "square" : "mic");

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

	addImageButton.addEventListener("click", () => imageInput.click());
	addFileButton.addEventListener("click", () => fileInput.click());
	recordAudioButton.addEventListener("click", () => {
		options.onToggleRecording();
	});

	imageInput.addEventListener("change", () => {
		if (imageInput.files) {
			void options.onAddFiles(Array.from(imageInput.files), "image");
			imageInput.value = "";
		}
	});

	fileInput.addEventListener("change", () => {
		if (fileInput.files) {
			void options.onAddFiles(Array.from(fileInput.files), "file");
			fileInput.value = "";
		}
	});
}
