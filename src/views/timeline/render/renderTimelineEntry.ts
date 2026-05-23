import type { App, Component } from "obsidian";
import { MarkdownRenderer } from "obsidian";

import type { TimelineAttachment } from "../../../models/TimelineAttachment";
import type { TimelineIndexItem } from "../../../models/TimelineEntry";
import { getDotClass, getLineClass } from "../utils/timelineGrouping";

interface RenderTimelineEntryOptions {
	selectedTag: string;
	onTagToggle: (tag: string) => void;
	onOpenMenu: (event: MouseEvent, item: TimelineIndexItem) => void;
	onTaskToggle: (
		item: TimelineIndexItem,
		taskIndex: number,
		checked: boolean,
	) => void;
	renderAttachments: (
		container: HTMLElement,
		attachments: TimelineAttachment[],
	) => void;
	renderMarkdown: (
		container: HTMLElement,
		markdown: string,
		item: TimelineIndexItem,
	) => Promise<void>;
}

export function renderTimelineEntry(
	container: HTMLElement,
	item: TimelineIndexItem,
	isFirst: boolean,
	_isLast: boolean,
	options: RenderTimelineEntryOptions,
): void {
	const entryEl = container.createDiv({ cls: "pt-entry" });
	const railEl = entryEl.createDiv({ cls: "pt-rail" });
	const lineClassName = getLineClass(item);
	if (!isFirst) {
		railEl.createDiv({ cls: `pt-line pt-line-top ${lineClassName}` });
	}
	railEl.createDiv({
		cls: `pt-dot ${getDotClass(item.type)}`,
	});
	railEl.createDiv({ cls: `pt-line pt-line-bottom ${lineClassName}` });

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

	if (item.contentMarkdown.trim()) {
		const bodyEl = mainEl.createDiv({
			cls: "pt-entry-body markdown-rendered",
		});
		void options.renderMarkdown(bodyEl, item.contentMarkdown, item);
	} else if (item.textPreview) {
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

export async function renderTimelineEntryMarkdown(
	app: App,
	component: Component,
	container: HTMLElement,
	markdown: string,
	sourcePath: string,
	onTaskToggle: (taskIndex: number, checked: boolean) => void,
): Promise<void> {
	container.empty();
	if (!markdown.trim()) {
		return;
	}

	await MarkdownRenderer.render(
		app,
		markdown,
		container,
		sourcePath,
		component,
	);

	Array.from(
		container.querySelectorAll<HTMLInputElement>(
			'input.task-list-item-checkbox[type="checkbox"]',
		),
	).forEach((checkbox, taskIndex) => {
		checkbox.addEventListener("change", () => {
			onTaskToggle(taskIndex, checkbox.checked);
		});
	});
}
