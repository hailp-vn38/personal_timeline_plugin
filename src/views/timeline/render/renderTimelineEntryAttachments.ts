import { TFile } from "obsidian";

import type { TimelineAttachment } from "../../../models/TimelineAttachment";

interface RenderTimelineEntryAttachmentsOptions {
	getFileByPath: (path: string) => TFile | null;
	getResourcePath: (file: TFile) => string;
}

export function renderTimelineEntryAttachments(
	container: HTMLElement,
	attachments: TimelineAttachment[],
	options: RenderTimelineEntryAttachmentsOptions,
): void {
	const imageAttachments = attachments
		.map((attachment) => ({
			attachment,
			file:
				attachment.type === "image"
					? options.getFileByPath(attachment.path)
					: null,
		}))
		.filter((item): item is { attachment: TimelineAttachment; file: TFile } =>
			item.file instanceof TFile,
		);
	const audioAttachments = attachments
		.map((attachment) => ({
			attachment,
			file:
				attachment.type === "audio"
					? options.getFileByPath(attachment.path)
					: null,
		}))
		.filter((item): item is { attachment: TimelineAttachment; file: TFile } =>
			item.file instanceof TFile,
		);

	if (imageAttachments.length === 0 && audioAttachments.length === 0) {
		return;
	}

	const detailList = container.createDiv({ cls: "pt-entry-attachments" });
	if (imageAttachments.length > 0) {
		const imageRow = detailList.createDiv({
			cls: "pt-entry-attachment-row pt-entry-image-row",
		});
		imageAttachments.forEach(({ attachment, file }) => {
			imageRow.createEl("img", {
				cls: "timeline-attachment-image pt-entry-image-thumb",
				attr: {
					src: options.getResourcePath(file),
					alt: attachment.name ?? file.name,
				},
			});
		});
	}

	if (audioAttachments.length > 0) {
		const audioRow = detailList.createDiv({
			cls: "pt-entry-attachment-row pt-entry-audio-row",
		});
		audioAttachments.forEach(({ file }) => {
			const audio = audioRow.createEl("audio", {
				cls: "timeline-attachment-audio pt-audio-player",
			});
			audio.controls = true;
			audio.src = options.getResourcePath(file);
		});
	}
}
