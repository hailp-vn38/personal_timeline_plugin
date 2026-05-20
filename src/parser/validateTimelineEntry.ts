import type { TimelineEntryMeta } from "../models/TimelineEntry";

export function isValidTimelineEntryMeta(value: unknown): value is TimelineEntryMeta {
	if (!value || typeof value !== "object") {
		return false;
	}

	const entry = value as Partial<TimelineEntryMeta>;

	return (
		entry.schemaVersion === 1 &&
		typeof entry.id === "string" &&
		typeof entry.type === "string" &&
		typeof entry.date === "string" &&
		typeof entry.time === "string" &&
		typeof entry.createdAt === "string" &&
		typeof entry.updatedAt === "string" &&
		Array.isArray(entry.tags) &&
		Array.isArray(entry.attachments) &&
		typeof entry.source === "string"
	);
}
