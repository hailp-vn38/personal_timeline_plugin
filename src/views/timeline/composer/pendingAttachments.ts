import type { PendingAttachmentInput } from "../../../storage/attachments";

export interface PendingQuickAttachment extends PendingAttachmentInput {
	previewUrl?: string;
}

export async function createPendingAttachmentFromFile(
	file: File,
	typeHint: PendingQuickAttachment["type"],
): Promise<PendingQuickAttachment> {
	const data = await file.arrayBuffer();
	const previewUrl =
		typeHint === "image" || typeHint === "audio"
			? URL.createObjectURL(file)
			: undefined;
	return {
		type: typeHint,
		name: file.name,
		mime: file.type,
		data,
		previewUrl,
	};
}

export function revokePreview(attachment: PendingQuickAttachment): void {
	if (attachment.previewUrl) {
		URL.revokeObjectURL(attachment.previewUrl);
	}
}

export function getAudioExtension(mimeType: string): string {
	if (mimeType.includes("mp4") || mimeType.includes("m4a")) {
		return ".m4a";
	}

	if (mimeType.includes("ogg")) {
		return ".ogg";
	}

	return ".webm";
}
