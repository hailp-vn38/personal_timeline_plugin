export type TimelineAttachmentType = "image" | "audio" | "file";

export interface TimelineAttachment {
	id: string;
	type: TimelineAttachmentType;
	path: string;
	name?: string;
	mime?: string;
	size?: number;
	createdAt?: string;
}
