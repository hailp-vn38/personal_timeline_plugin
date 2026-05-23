import type { TimelineIndexItem } from "../../../models/TimelineEntry";

export function groupEntriesByDate(
	entries: TimelineIndexItem[],
): Array<[string, TimelineIndexItem[]]> {
	const groups = new Map<string, TimelineIndexItem[]>();

	for (const entry of entries) {
		const list = groups.get(entry.date) ?? [];
		list.push(entry);
		groups.set(entry.date, list);
	}

	for (const list of groups.values()) {
		list.sort((left, right) =>
			right.createdAt.localeCompare(left.createdAt),
		);
	}

	return [...groups.entries()].sort(([left], [right]) =>
		right.localeCompare(left),
	);
}

export function getDotClass(type?: TimelineIndexItem["type"]): string {
	switch (type) {
		case "note":
			return "pt-dot-note";
		case "image":
			return "pt-dot-image";
		case "audio":
			return "pt-dot-audio";
		case "file":
			return "pt-dot-file";
		case "mixed":
			return "pt-dot-mixed";
		case "checkin":
		default:
			return "pt-dot-checkin";
	}
}

export function getLineClass(item: TimelineIndexItem): string {
	if (item.attachmentTypes.includes("audio")) {
		return "pt-line-audio";
	}

	if (item.attachmentTypes.includes("image")) {
		return "pt-line-image";
	}

	return "pt-line-default";
}
