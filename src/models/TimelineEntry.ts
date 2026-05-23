import type { TimelineAttachment, TimelineAttachmentType } from "./TimelineAttachment";

export type TimelineEntryType = "checkin" | "note" | "image" | "audio" | "file" | "mixed";

export type TimelineEntrySource = "manual" | "quick-capture" | "imported";

export interface TimelineEntryMeta {
	schemaVersion: 1;
	id: string;
	type: TimelineEntryType;
	date: string;
	time: string;
	createdAt: string;
	updatedAt: string;
	tags: string[];
	mood?: string | null;
	source: TimelineEntrySource;
	attachments: TimelineAttachment[];
}

export interface ParsedTimelineEntry {
	meta: TimelineEntryMeta;
	markdown: string;
	blockStart: number;
	blockEnd: number;
}

export interface TimelineEntryDraft {
	content: string;
	tags: string[];
	type?: TimelineEntryType;
	source?: TimelineEntrySource;
	attachments?: TimelineAttachment[];
}

export interface TimelineIndexItem {
	id: string;
	type?: TimelineEntryType;
	date: string;
	time: string;
	createdAt: string;
	updatedAt: string;
	tags: string[];
	mood?: string | null;
	attachments: TimelineAttachment[];
	attachmentTypes: TimelineAttachmentType[];
	sourcePath: string;
	blockId: string;
	textPreview: string;
	contentMarkdown: string;
}
