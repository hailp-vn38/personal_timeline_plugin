import type { PendingAttachmentInput } from "../../../storage/attachments";

import {
	createPendingAttachmentFromFile,
	type PendingQuickAttachment,
	revokePreview,
} from "./pendingAttachments";

export async function appendPendingFiles(
	attachments: PendingQuickAttachment[],
	files: File[],
	typeHint: PendingQuickAttachment["type"],
): Promise<void> {
	for (const file of files) {
		attachments.push(await createPendingAttachmentFromFile(file, typeHint));
	}
}

export async function appendPastedImages(
	attachments: PendingQuickAttachment[],
	event: ClipboardEvent,
): Promise<boolean> {
	const clipboardItems = Array.from(event.clipboardData?.items ?? []);
	const imageItems = clipboardItems.filter((item) =>
		item.type.startsWith("image/"),
	);
	if (imageItems.length === 0) {
		return false;
	}

	event.preventDefault();
	for (const item of imageItems) {
		const blob = item.getAsFile();
		if (!blob) {
			continue;
		}

		const file = new File([blob], `pasted-image-${Date.now()}.png`, {
			type: blob.type || "image/png",
		});
		attachments.push(await createPendingAttachmentFromFile(file, "image"));
	}

	return true;
}

export function removePendingAttachment(
	attachments: PendingQuickAttachment[],
	index: number,
): boolean {
	const target = attachments[index];
	if (!target) {
		return false;
	}

	revokePreview(target);
	attachments.splice(index, 1);
	return true;
}

export function releasePendingAttachmentPreviews(
	attachments: PendingQuickAttachment[],
): void {
	for (const attachment of attachments) {
		revokePreview(attachment);
	}
}

export function getPendingAttachmentCardClass(
	attachment: PendingQuickAttachment,
): string {
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

export function formatPendingAttachmentSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}

	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}

	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mapPendingAttachmentsToInputs(
	attachments: PendingQuickAttachment[],
): PendingAttachmentInput[] {
	return attachments.map((attachment) => ({
		type: attachment.type,
		name: attachment.name,
		mime: attachment.mime,
		data: attachment.data,
	}));
}
