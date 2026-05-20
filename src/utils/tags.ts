import type { PendingAttachmentInput } from "../storage/attachments";

export function parseTags(rawValue: string): string[] {
	return Array.from(
		new Set(
			rawValue
				.split(/[,\s]+/)
				.map((value) => value.trim().replace(/^#/, ""))
				.filter(Boolean),
		),
	);
}

export function canCreateQuickCheckIn(
	content: string,
	tags: string[],
	attachments: PendingAttachmentInput[],
): boolean {
	return content.trim().length > 0 || tags.length > 0 || attachments.length > 0;
}
