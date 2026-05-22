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
	for (const [date, entries] of groupEntriesByDate(options.items)) {
		const groupEl = container.createDiv({ cls: "pt-day-group" });
		groupEl.createDiv({
			cls: "pt-day-header",
			text: formatDayHeader(date, options.today),
		});

		const timelineEl = groupEl.createDiv({ cls: "pt-timeline" });
		entries.forEach((entry, index) => {
			renderTimelineEntry(
				timelineEl,
				entry,
				index === entries.length - 1,
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
