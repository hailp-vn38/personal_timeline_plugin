import type { ParsedTimelineEntry, TimelineEntryMeta } from "../models/TimelineEntry";

import { isValidTimelineEntryMeta } from "./validateTimelineEntry";

export const TIMELINE_ENTRY_REGEX = /<!--\s*timeline-entry\s*([\s\S]*?)\s*-->/g;

export function countMalformedTimelineEntryMetas(markdown: string): number {
	let malformed = 0;
	let match: RegExpExecArray | null;

	TIMELINE_ENTRY_REGEX.lastIndex = 0;
	while ((match = TIMELINE_ENTRY_REGEX.exec(markdown)) !== null) {
		const rawJson = match[1];
		if (!rawJson) {
			malformed += 1;
			continue;
		}

		try {
			const meta = JSON.parse(rawJson.trim()) as TimelineEntryMeta;
			if (!isValidTimelineEntryMeta(meta)) {
				malformed += 1;
			}
		} catch {
			malformed += 1;
		}
	}

	TIMELINE_ENTRY_REGEX.lastIndex = 0;
	return malformed;
}

export function parseTimelineEntryMetas(markdown: string): TimelineEntryMeta[] {
	const entries: TimelineEntryMeta[] = [];
	let match: RegExpExecArray | null;

	TIMELINE_ENTRY_REGEX.lastIndex = 0;
	while ((match = TIMELINE_ENTRY_REGEX.exec(markdown)) !== null) {
		const rawJson = match[1];
		if (!rawJson) {
			continue;
		}

		try {
			const meta = JSON.parse(rawJson.trim()) as TimelineEntryMeta;
			if (isValidTimelineEntryMeta(meta)) {
				entries.push(meta);
			}
		} catch {
			// Ignore malformed metadata comments to avoid breaking the plugin.
		}
	}

	TIMELINE_ENTRY_REGEX.lastIndex = 0;
	return entries;
}

export function parseTimelineEntries(markdown: string): ParsedTimelineEntry[] {
	const headingRegex = /^##\s+.*?\s+\^(tl-[A-Za-z0-9_-]+)\s*$/gm;
	const headings: Array<{ id: string; start: number }> = [];
	let headingMatch: RegExpExecArray | null;

	while ((headingMatch = headingRegex.exec(markdown)) !== null) {
		const headingId = headingMatch[1];
		if (!headingId) {
			continue;
		}

		headings.push({
			id: headingId,
			start: headingMatch.index,
		});
	}

	const result: ParsedTimelineEntry[] = [];

	for (let index = 0; index < headings.length; index++) {
		const current = headings[index];
		if (!current) {
			continue;
		}

		const next = headings[index + 1];
		const blockStart = current.start;
		const blockEnd = next ? next.start : markdown.length;
		const blockMarkdown = markdown.slice(blockStart, blockEnd);
		const jsonMatch = /<!--\s*timeline-entry\s*([\s\S]*?)\s*-->/.exec(blockMarkdown);

		if (!jsonMatch) {
			continue;
		}

		try {
			const rawJson = jsonMatch[1];
			if (!rawJson) {
				continue;
			}

			const meta = JSON.parse(rawJson.trim()) as TimelineEntryMeta;
			if (isValidTimelineEntryMeta(meta) && meta.id === current.id) {
				result.push({
					meta,
					markdown: blockMarkdown,
					blockStart,
					blockEnd,
				});
			}
		} catch {
			// Ignore malformed entry blocks until the recovery flow is implemented.
		}
	}

	return result;
}
