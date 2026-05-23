import type { TimelineAttachment } from "../../../models/TimelineAttachment";
import type { TimelineIndexItem } from "../../../models/TimelineEntry";
import { formatDayHeader } from "../utils/timelineDates";
import { groupEntriesByDate } from "../utils/timelineGrouping";
import { renderTimelineEntry } from "./renderTimelineEntry";

interface RenderTimelineListOptions {
	items: TimelineIndexItem[];
	today: string;
	selectedTag: string;
	onTagToggle: (tag: string) => void;
	onOpenMenu: (event: MouseEvent, item: TimelineIndexItem) => void;
	renderAttachments: (
		container: HTMLElement,
		attachments: TimelineAttachment[],
	) => void;
}

export function renderTimelineList(
	container: HTMLElement,
	options: RenderTimelineListOptions,
): void {
	const groups = groupEntriesByDate(options.items);
	let renderedEntryCount = 0;
	const totalEntries = options.items.length;

	for (const [date, entries] of groups) {
		const groupEl = container.createDiv({ cls: "pt-day-group" });
		groupEl.createDiv({
			cls: "pt-day-header",
			text: formatDayHeader(date, options.today),
		});

		const timelineEl = groupEl.createDiv({ cls: "pt-timeline" });
		entries.forEach((entry) => {
			renderedEntryCount += 1;
			renderTimelineEntry(
				timelineEl,
				entry,
				renderedEntryCount === 1,
				renderedEntryCount === totalEntries,
				{
					selectedTag: options.selectedTag,
					onTagToggle: options.onTagToggle,
					onOpenMenu: options.onOpenMenu,
					renderAttachments: options.renderAttachments,
				},
			);
		});
	}
}
