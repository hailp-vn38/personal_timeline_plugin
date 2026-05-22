import type { TimelineAttachment } from "../../../models/TimelineAttachment";
import type { TimelineIndexItem } from "../../../models/TimelineEntry";
import { getDotClass } from "../utils/timelineGrouping";

interface RenderTimelineEntryOptions {
	selectedTag: string;
	onTagToggle: (tag: string) => void;
	onOpenMenu: (event: MouseEvent, item: TimelineIndexItem) => void;
	renderAttachments: (
		container: HTMLElement,
		attachments: TimelineAttachment[],
	) => void;
}

export function renderTimelineEntry(
	container: HTMLElement,
	item: TimelineIndexItem,
	isLast: boolean,
	options: RenderTimelineEntryOptions,
): void {
	const entryEl = container.createDiv({ cls: "pt-entry" });
	const railEl = entryEl.createDiv({ cls: "pt-rail" });
	railEl.createDiv({
		cls: `pt-dot ${getDotClass(item.type)}`,
	});
	if (!isLast) {
		railEl.createDiv({ cls: "pt-line" });
	}

	const mainEl = entryEl.createDiv({ cls: "pt-entry-main" });
	const headerEl = mainEl.createDiv({ cls: "pt-entry-header" });
	headerEl.createSpan({ cls: "pt-entry-time", text: item.time });
	headerEl.createDiv({ cls: "pt-entry-header-spacer" });
	const menuButton = headerEl.createEl("button", {
		cls: "pt-entry-menu",
		text: "⋯",
	});
	menuButton.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		options.onOpenMenu(event, item);
	});

	if (item.textPreview) {
		mainEl.createDiv({
			cls: "pt-entry-body",
			text: item.textPreview,
		});
	}

	if (item.tags.length > 0) {
		const tagsEl = mainEl.createDiv({ cls: "pt-entry-tags" });
		for (const tag of item.tags) {
			const normalizedTag = tag.replace(/^#/, "");
			const tagButton = tagsEl.createEl("button", {
				cls: `pt-tag${options.selectedTag === normalizedTag ? " is-active" : ""}`,
				text: `#${normalizedTag}`,
				attr: {
					type: "button",
					"aria-pressed":
						options.selectedTag === normalizedTag ? "true" : "false",
					"aria-label": `Filter by #${normalizedTag}`,
				},
			});
			tagButton.addEventListener("click", () => {
				options.onTagToggle(normalizedTag);
			});
		}
	}

	if (item.attachments.length > 0) {
		options.renderAttachments(mainEl, item.attachments);
	}
}
