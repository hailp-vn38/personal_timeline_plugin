import { setIcon } from "obsidian";

import {
	formatPendingAttachmentSize,
	getPendingAttachmentCardClass,
} from "./composerAttachments";
import type { PendingQuickAttachment } from "./pendingAttachments";

interface RenderPendingAttachmentsOptions {
	attachments: PendingQuickAttachment[];
	onRemove: (index: number) => void;
}

export function renderPendingAttachments(
	container: HTMLElement,
	options: RenderPendingAttachmentsOptions,
): void {
	if (options.attachments.length === 0) {
		return;
	}

	const section = container.createDiv({
		cls: "timeline-pending-section",
	});
	const imageRow = section.createDiv({
		cls: "timeline-pending-list timeline-pending-images",
	});
	const fileRow = section.createDiv({
		cls: "timeline-pending-list timeline-pending-files",
	});
	const audioRow = section.createDiv({
		cls: "timeline-pending-list timeline-pending-audios",
	});

	options.attachments.forEach((attachment, index) => {
		const parent =
			attachment.type === "image"
				? imageRow
				: attachment.type === "file"
					? fileRow
					: audioRow;
		const card = parent.createDiv({
			cls: `timeline-pending-card ${getPendingAttachmentCardClass(attachment)}`,
		});

		if (attachment.type === "image" && attachment.previewUrl) {
			card.createEl("img", {
				cls: "timeline-attachment-image",
				attr: { src: attachment.previewUrl, alt: attachment.name },
			});
		} else if (attachment.type === "audio") {
			const audioSummary = card.createDiv({
				cls: "timeline-pending-audio-row",
			});
			if (attachment.previewUrl) {
				audioSummary.createEl("audio", {
					cls: "timeline-pending-audio-player",
					attr: {
						controls: "true",
						preload: "metadata",
						src: attachment.previewUrl,
					},
				});
			}
			const removeButton = audioSummary.createEl("button", {
				cls: "timeline-pending-remove is-inline",
				attr: { "aria-label": `Remove ${attachment.name}` },
			});
			setIcon(removeButton, "x");
			removeButton.addEventListener("click", () => {
				options.onRemove(index);
			});
			return;
		} else if (attachment.type === "file") {
			const fileSummary = card.createDiv({
				cls: "timeline-pending-file-row",
			});
			const fileIcon = fileSummary.createDiv({
				cls: "timeline-pending-file-icon",
			});
			setIcon(fileIcon, "file-down");
			const fileBody = fileSummary.createDiv({
				cls: "timeline-pending-file-body",
			});
			fileBody.createEl("strong", {
				cls: "timeline-pending-file-name",
				text: attachment.name,
			});
			fileBody.createEl("div", {
				cls: "timeline-pending-file-size",
				text: formatPendingAttachmentSize(attachment.data.byteLength),
			});
		}

		const removeButton = card.createEl("button", {
			cls: "timeline-pending-remove",
			attr: { "aria-label": `Remove ${attachment.name}` },
		});
		setIcon(removeButton, "x");
		removeButton.addEventListener("click", () => {
			options.onRemove(index);
		});
	});
}
