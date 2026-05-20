import type { TimelineIndexItem } from "../models/TimelineEntry";

export function collectTimelineTags(items: TimelineIndexItem[]): string[] {
	return Array.from(new Set(items.flatMap((item) => item.tags))).sort((left, right) =>
		left.localeCompare(right),
	);
}
