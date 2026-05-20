import { TFile, type MarkdownPostProcessorContext } from "obsidian";

import type PersonalTimelinePlugin from "../main";
import type { ParsedTimelineEntry, TimelineEntryMeta } from "../models/TimelineEntry";
import type { TimelineMetadataReadingViewMode } from "../models/TimelineSettings";
import { parseTimelineEntries } from "../parser/parseTimelineEntries";

export async function renderTimelineMetadataInReadingView(
	plugin: PersonalTimelinePlugin,
	rootEl: HTMLElement,
	ctx: MarkdownPostProcessorContext,
): Promise<void> {
	if (!plugin.settings.showMetadataInReadingView) {
		return;
	}

	const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile) || file.extension !== "md") {
		return;
	}

	if (!isTimelineFile(ctx.sourcePath, plugin.settings.timelineFolder)) {
		return;
	}

	const markdown = await plugin.app.vault.read(file);
	if (!isTimelineMarkdown(markdown)) {
		return;
	}

	const entries = parseTimelineEntries(markdown);
	if (!entries.length) {
		return;
	}

	injectTimelineMetadataUi(rootEl, entries, plugin.settings.metadataReadingViewMode);
}

function isTimelineFile(path: string, timelineFolder: string): boolean {
	return path.startsWith(`${timelineFolder.replace(/\/+$/, "")}/`);
}

function isTimelineMarkdown(markdown: string): boolean {
	return /^---[\s\S]*?type:\s*timeline-day[\s\S]*?---/.test(markdown);
}

function injectTimelineMetadataUi(
	rootEl: HTMLElement,
	entries: ParsedTimelineEntry[],
	mode: TimelineMetadataReadingViewMode,
): void {
	for (const entry of entries) {
		const headingEl =
			findRenderedBlockElement(rootEl, entry.meta.id) ||
			findHeadingByEntryMeta(rootEl, entry.meta);

		if (!headingEl) {
			continue;
		}

		const alreadyRendered = rootEl.querySelector(
			`.pt-reading-metadata[data-entry-id="${entry.meta.id}"]`,
		);
		if (alreadyRendered) {
			continue;
		}

		const metadataEl = createReadingMetadataElement(entry.meta, mode);
		headingEl.insertAdjacentElement("afterend", metadataEl);
	}
}

function findRenderedBlockElement(rootEl: HTMLElement, blockId: string): HTMLElement | null {
	const escapedId = CSS.escape(blockId);
	const anchor =
		rootEl.querySelector(`[href$="#^${escapedId}"]`) ||
		rootEl.querySelector(`[data-href$="#^${escapedId}"]`) ||
		rootEl.querySelector(`[id="${escapedId}"]`);

	if (!anchor) {
		return null;
	}

	return anchor.closest("h1,h2,h3,h4,h5,h6");
}

function findHeadingByEntryMeta(rootEl: HTMLElement, meta: TimelineEntryMeta): HTMLElement | null {
	const headings = Array.from(rootEl.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6"));
	return (
		headings.find((heading) => {
			const text = heading.textContent ?? "";
			return text.includes(meta.time);
		}) ?? null
	);
}

function createReadingMetadataElement(
	meta: TimelineEntryMeta,
	mode: TimelineMetadataReadingViewMode,
): HTMLElement {
	const container = document.createElement("div");
	container.className = "pt-reading-metadata";
	container.dataset.entryId = meta.id;

	if (mode === "summary") {
		renderMetadataSummary(container, meta);
	}

	if (mode === "table") {
		renderMetadataTable(container, meta);
	}

	if (mode === "json") {
		renderMetadataJson(container, meta);
	}

	return container;
}

function renderMetadataSummary(container: HTMLElement, meta: TimelineEntryMeta): void {
	const summary = [
		meta.type,
		meta.date,
		meta.time,
		`${meta.tags.length} tags`,
		`${meta.attachments.length} attachments`,
	].join(" · ");

	container.createDiv({
		cls: "pt-reading-metadata-summary",
		text: summary,
	});
}

function renderMetadataTable(container: HTMLElement, meta: TimelineEntryMeta): void {
	const headerEl = container.createDiv({
		cls: "pt-reading-metadata-header",
	});
	headerEl.createSpan({
		cls: "pt-reading-metadata-title",
		text: "Timeline metadata",
	});

	const copyButton = headerEl.createEl("button", {
		cls: "pt-reading-metadata-copy",
		text: "Copy JSON",
	});
	copyButton.addEventListener("click", () => {
		void navigator.clipboard.writeText(JSON.stringify(meta, null, 2));
	});

	const tableEl = container.createDiv({
		cls: "pt-reading-metadata-table",
	});
	renderMetadataRow(tableEl, "id", meta.id);
	renderMetadataRow(tableEl, "type", meta.type);
	renderMetadataRow(tableEl, "date", meta.date);
	renderMetadataRow(tableEl, "time", meta.time);
	renderMetadataRow(tableEl, "createdAt", meta.createdAt);
	renderMetadataRow(tableEl, "updatedAt", meta.updatedAt);
	renderMetadataRow(tableEl, "tags", meta.tags.join(", "));
	renderMetadataRow(tableEl, "source", meta.source);
	renderMetadataRow(tableEl, "attachments", String(meta.attachments.length));
}

function renderMetadataRow(container: HTMLElement, key: string, value: string): void {
	const rowEl = container.createDiv({
		cls: "pt-reading-metadata-row",
	});
	rowEl.createDiv({
		cls: "pt-reading-metadata-key",
		text: key,
	});
	rowEl.createDiv({
		cls: "pt-reading-metadata-value",
		text: value || "—",
	});
}

function renderMetadataJson(container: HTMLElement, meta: TimelineEntryMeta): void {
	const headerEl = container.createDiv({
		cls: "pt-reading-metadata-header",
	});
	headerEl.createSpan({
		cls: "pt-reading-metadata-title",
		text: "Timeline metadata JSON",
	});

	const copyButton = headerEl.createEl("button", {
		cls: "pt-reading-metadata-copy",
		text: "Copy JSON",
	});
	copyButton.addEventListener("click", () => {
		void navigator.clipboard.writeText(JSON.stringify(meta, null, 2));
	});

	const preEl = container.createEl("pre", {
		cls: "pt-reading-metadata-json",
	});
	const codeEl = preEl.createEl("code");
	codeEl.setText(JSON.stringify(meta, null, 2));
}
