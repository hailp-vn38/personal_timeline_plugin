import type { ParsedTimelineEntry, TimelineEntryMeta } from "../models/TimelineEntry";

import { parseTimelineEntries } from "./parseTimelineEntries";

export function updateEntryMetaInBlock(
	blockMarkdown: string,
	nextMeta: TimelineEntryMeta,
): string {
	const nextJson = JSON.stringify(nextMeta, null, 2);

	return blockMarkdown.replace(
		/<!--\s*timeline-entry\s*[\s\S]*?\s*-->/,
		["<!-- timeline-entry", nextJson, "-->"].join("\n"),
	);
}

export function replaceEntryBlock(
	fileMarkdown: string,
	entryId: string,
	nextBlockMarkdown: string,
): string {
	const target = findEntryOrThrow(fileMarkdown, entryId);

	return (
		fileMarkdown.slice(0, target.blockStart) +
		nextBlockMarkdown.trimEnd() +
		"\n\n" +
		fileMarkdown.slice(target.blockEnd).trimStart()
	);
}

export function removeEntryBlock(fileMarkdown: string, entryId: string): string {
	const target = findEntryOrThrow(fileMarkdown, entryId);
	const before = fileMarkdown.slice(0, target.blockStart).trimEnd();
	const after = fileMarkdown.slice(target.blockEnd).trimStart();

	if (!after) {
		return `${before}\n`;
	}

	return `${before}\n\n${after}`;
}

function findEntryOrThrow(fileMarkdown: string, entryId: string): ParsedTimelineEntry {
	const target = parseTimelineEntries(fileMarkdown).find((entry) => entry.meta.id === entryId);
	if (!target) {
		throw new Error(`Timeline entry not found: ${entryId}`);
	}

	return target;
}
