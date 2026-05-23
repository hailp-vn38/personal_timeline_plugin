import { TFile, type App } from "obsidian";

import type { TimelineIndexItem } from "../models/TimelineEntry";
import type { TimelinePluginSettings } from "../models/TimelineSettings";
import { countMalformedTimelineEntryMetas, parseTimelineEntries } from "../parser/parseTimelineEntries";
import { extractEditableMarkdownContent } from "../storage/timelineRepository";

import { TimelineIndex } from "./TimelineIndex";

export class TimelineIndexService {
	private readonly index = new TimelineIndex();
	private readonly fileCache = new Map<string, CachedTimelineFile>();
	private malformedEntryCount = 0;

	constructor(
		private readonly app: App,
		private readonly settings: TimelinePluginSettings,
	) {}

	async rebuild(): Promise<void> {
		this.index.clear();
		this.fileCache.clear();
		this.malformedEntryCount = 0;
		const timelineFolder = normalizeFolder(this.settings.timelineFolder);
		const files = this.app.vault.getFiles().filter((file) => isTimelineFile(file, timelineFolder));

		for (const file of files) {
			await this.readAndCacheFile(file);
		}

		this.rebuildIndexFromCache();
	}

	async refreshFile(file: TFile): Promise<void> {
		const timelineFolder = normalizeFolder(this.settings.timelineFolder);
		if (!isTimelineFile(file, timelineFolder)) {
			return;
		}

		await this.readAndCacheFile(file);
		this.rebuildIndexFromCache();
	}

	removeBySourcePath(path: string): void {
		this.fileCache.delete(path);
		this.rebuildIndexFromCache();
	}

	getAll(): TimelineIndexItem[] {
		return this.index.getAll();
	}

	getAvailableTags(): string[] {
		return Array.from(new Set(this.index.getAll().flatMap((item) => item.tags))).sort((left, right) =>
			left.localeCompare(right),
		);
	}

	getTagSuggestionsForDate(
		date: string,
		excludedTags: string[] = [],
		limit = 8,
	): string[] {
		const excluded = new Set(excludedTags);
		const tagStats = new Map<string, { count: number; lastUsedAt: string }>();

		for (const item of this.index.getAll()) {
			if (item.date !== date) {
				continue;
			}

			for (const tag of item.tags) {
				if (excluded.has(tag)) {
					continue;
				}

				const current = tagStats.get(tag);
				if (!current) {
					tagStats.set(tag, {
						count: 1,
						lastUsedAt: item.createdAt,
					});
					continue;
				}

				current.count += 1;
				if (item.createdAt > current.lastUsedAt) {
					current.lastUsedAt = item.createdAt;
				}
			}
		}

		return [...tagStats.entries()]
			.sort((left, right) => {
				const [, leftStat] = left;
				const [, rightStat] = right;
				if (rightStat.count !== leftStat.count) {
					return rightStat.count - leftStat.count;
				}

				if (rightStat.lastUsedAt !== leftStat.lastUsedAt) {
					return rightStat.lastUsedAt.localeCompare(leftStat.lastUsedAt);
				}

				return left[0].localeCompare(right[0]);
			})
			.slice(0, limit)
			.map(([tag]) => tag);
	}

	getMalformedEntryCount(): number {
		return this.malformedEntryCount;
	}

	private async readAndCacheFile(file: TFile): Promise<void> {
		const markdown = await this.app.vault.cachedRead(file);
		const malformedCount = countMalformedTimelineEntryMetas(markdown);
		const entries = parseTimelineEntries(markdown);
		const items = entries.map((entry) => createIndexItem(file, entry));
		this.fileCache.set(file.path, {
			path: file.path,
			malformedCount,
			items,
		});
	}

	private rebuildIndexFromCache(): void {
		this.index.clear();
		this.malformedEntryCount = 0;

		for (const cachedFile of this.fileCache.values()) {
			this.malformedEntryCount += cachedFile.malformedCount;
			for (const item of cachedFile.items) {
				this.index.upsert(item);
			}
		}
	}
}

interface CachedTimelineFile {
	path: string;
	malformedCount: number;
	items: TimelineIndexItem[];
}

function isTimelineFile(file: TFile, timelineFolder: string): boolean {
	return file.extension === "md" && file.path.startsWith(`${timelineFolder}/`);
}

function normalizeFolder(folder: string): string {
	return folder.replace(/\/+$/, "");
}

function extractTextPreview(blockMarkdown: string): string {
	const body = blockMarkdown
		.replace(/^##\s+.*$/m, "")
		.replace(/<!--\s*timeline-entry\s*[\s\S]*?\s*-->/, "")
		.replace(/^!\[\[(.*?)\]\]\s*$/gm, "")
		.replace(/^\[\[(.*?)\]\]\s*$/gm, "")
		.trim();

	return body.length > 240 ? `${body.slice(0, 237)}...` : body;
}

function createIndexItem(file: TFile, entry: ReturnType<typeof parseTimelineEntries>[number]): TimelineIndexItem {
	const contentMarkdown = extractEditableMarkdownContent(
		entry.markdown,
		entry.meta.attachments,
	);

	return {
		id: entry.meta.id,
		type: entry.meta.type,
		date: entry.meta.date,
		time: entry.meta.time,
		createdAt: entry.meta.createdAt,
		updatedAt: entry.meta.updatedAt,
		tags: entry.meta.tags,
		mood: entry.meta.mood,
		attachments: entry.meta.attachments,
		attachmentTypes: entry.meta.attachments.map((attachment) => attachment.type),
		sourcePath: file.path,
		blockId: entry.meta.id,
		textPreview: extractTextPreview(entry.markdown),
		contentMarkdown,
	};
}
