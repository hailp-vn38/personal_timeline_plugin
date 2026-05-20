import type { TimelineDayProperties } from "../models/TimelineDayProperties";
import type { TimelineEntryMeta } from "../models/TimelineEntry";

export function createTimelineDayTemplate(date: string, nowIso: string): string {
	const properties: TimelineDayProperties = {
		type: "timeline-day",
		date,
		timeline_version: 1,
		entry_count: 0,
		created_at: nowIso,
		updated_at: nowIso,
	};

	return `---\n${serializeFrontmatter(properties)}\n---\n\n`;
}

export function createTimelineEntryBlock(
	meta: TimelineEntryMeta,
	markdownContent: string,
): string {
	const json = JSON.stringify(meta, null, 2);

	return [
		`## ${meta.time} ^${meta.id}`,
		"",
		"<!-- timeline-entry",
		json,
		"-->",
		"",
		markdownContent.trim(),
		"",
	].join("\n");
}

function serializeFrontmatter(properties: TimelineDayProperties): string {
	return [
		`type: ${properties.type}`,
		`date: ${properties.date}`,
		`timeline_version: ${properties.timeline_version}`,
		`entry_count: ${properties.entry_count}`,
		`created_at: ${properties.created_at}`,
		`updated_at: ${properties.updated_at}`,
	].join("\n");
}
