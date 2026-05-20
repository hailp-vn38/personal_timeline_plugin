import { App, Notice, TFile } from "obsidian";

import type { TimelineAttachment } from "../models/TimelineAttachment";
import type { ParsedTimelineEntry, TimelineEntryDraft, TimelineEntryMeta, TimelineEntryType } from "../models/TimelineEntry";
import type { TimelinePluginSettings } from "../models/TimelineSettings";
import { removeEntryBlock, replaceEntryBlock } from "../parser/mutateTimelineEntries";
import { parseTimelineEntries } from "../parser/parseTimelineEntries";
import { formatDateForFile, formatTimeForEntry, toIsoString } from "../utils/date";
import { createAttachmentId, createTimelineEntryId } from "../utils/id";

import { buildAttachmentEmbeds, persistAttachments, type PendingAttachmentInput } from "./attachments";
import { ensureNestedFolder } from "./folder";
import { updateTimelineFrontmatter } from "./frontmatter";
import { createTimelineDayTemplate, createTimelineEntryBlock } from "./timelineFile";
import { getTimelineFilePath } from "./timelinePaths";

export interface TimelineDayData {
	date: string;
	file: TFile | null;
	entries: ParsedTimelineEntry[];
}

export interface TimelineEntryEditInput {
	time: string;
	content: string;
	tags: string[];
}

export class TimelineRepository {
	constructor(
		private readonly app: App,
		private readonly settings: TimelinePluginSettings,
	) {}

	async createTextEntry(
		draft: TimelineEntryDraft,
		date = new Date(),
		pendingAttachments: PendingAttachmentInput[] = [],
	): Promise<{ file: TFile; entry: ParsedTimelineEntry }> {
		const currentDate = formatDateForFile(date);
		const timestamp = toIsoString(date);
		const file = await this.ensureTimelineDayFile(currentDate, timestamp);
		const persistedAttachments = await persistAttachments(
			this.app,
			this.settings,
			currentDate,
			date,
			pendingAttachments,
		);
		const allAttachments = [...(draft.attachments ?? []), ...persistedAttachments];
		const entryType = determineEntryType(draft.content, allAttachments.map((attachment) => attachment.type));
		const meta: TimelineEntryMeta = {
			schemaVersion: 1,
			id: createTimelineEntryId(date),
			type: draft.type ?? entryType,
			date: currentDate,
			time: formatTimeForEntry(date),
			createdAt: timestamp,
			updatedAt: timestamp,
			tags: draft.tags,
			source: draft.source ?? "manual",
			attachments: allAttachments,
		};

		const markdownContent = combineContentAndEmbeds(draft.content, allAttachments);
		const entryBlock = createTimelineEntryBlock(meta, markdownContent);
		const existingContent = await this.app.vault.cachedRead(file);
		const separator = existingContent.trimEnd().length > 0 ? "\n\n" : "";
		await this.app.vault.modify(file, `${existingContent.trimEnd()}${separator}${entryBlock}\n`);

		const entries = await this.readEntriesFromFile(file);
		await updateTimelineFrontmatter(file, entries.length, timestamp);

		const createdEntry = entries.find((entry) => entry.meta.id === meta.id);
		if (!createdEntry) {
			throw new Error(`Failed to locate newly created timeline entry: ${meta.id}`);
		}

		return { file, entry: createdEntry };
	}

	async readTimelineDay(date: string): Promise<TimelineDayData> {
		const path = getTimelineFilePath(this.settings, date);
		const abstractFile = this.app.vault.getAbstractFileByPath(path);

		if (!(abstractFile instanceof TFile)) {
			return { date, file: null, entries: [] };
		}

		return {
			date,
			file: abstractFile,
			entries: await this.readEntriesFromFile(abstractFile),
		};
	}

	async getTimelineFileForDate(date: string): Promise<TFile | null> {
		const path = getTimelineFilePath(this.settings, date);
		const abstractFile = this.app.vault.getAbstractFileByPath(path);
		return abstractFile instanceof TFile ? abstractFile : null;
	}

	async getEntryById(sourcePath: string, entryId: string): Promise<ParsedTimelineEntry | null> {
		const abstractFile = this.app.vault.getAbstractFileByPath(sourcePath);
		if (!(abstractFile instanceof TFile)) {
			return null;
		}

		const entries = await this.readEntriesFromFile(abstractFile);
		return entries.find((entry) => entry.meta.id === entryId) ?? null;
	}

	async updateEntry(
		sourcePath: string,
		entryId: string,
		input: TimelineEntryEditInput,
	): Promise<void> {
		const file = this.requireTimelineFile(sourcePath);
		const markdown = await this.app.vault.cachedRead(file);
		const entries = parseTimelineEntries(markdown);
		const target = entries.find((entry) => entry.meta.id === entryId);
		if (!target) {
			throw new Error(`Timeline entry not found: ${entryId}`);
		}

		const updatedAt = toIsoString(new Date());
		const baseMeta = stripLegacyTitle(target.meta);
		const nextMeta: TimelineEntryMeta = {
			...baseMeta,
			time: input.time,
			tags: input.tags,
			updatedAt,
		};
		const nextBlock = createTimelineEntryBlock(
			nextMeta,
			combineContentAndEmbeds(input.content, target.meta.attachments),
		);
		const nextMarkdown = replaceEntryBlock(markdown, entryId, nextBlock);
		await this.app.vault.modify(file, nextMarkdown);
		await updateTimelineFrontmatter(file, entries.length, updatedAt);
	}

	async deleteEntry(sourcePath: string, entryId: string): Promise<void> {
		const file = this.requireTimelineFile(sourcePath);
		const markdown = await this.app.vault.cachedRead(file);
		const entries = parseTimelineEntries(markdown);
		const nextMarkdown = removeEntryBlock(markdown, entryId);
		await this.app.vault.modify(file, nextMarkdown);
		await updateTimelineFrontmatter(file, Math.max(entries.length - 1, 0), toIsoString(new Date()));
	}

	async duplicateEntry(sourcePath: string, entryId: string): Promise<void> {
		const target = await this.getEntryById(sourcePath, entryId);
		if (!target) {
			throw new Error(`Timeline entry not found: ${entryId}`);
		}

		const now = new Date();
		const content = extractEditableMarkdownContent(target.markdown, target.meta.attachments);
		await this.createTextEntry(
			{
				content,
				tags: [...target.meta.tags],
				type: target.meta.type,
				source: "manual",
				attachments: cloneAttachments(target.meta.attachments, now),
			},
			new Date(`${target.meta.date}T${currentSecondsTime(now)}`),
		);
	}

	private async ensureTimelineDayFile(date: string, nowIso: string): Promise<TFile> {
		const path = getTimelineFilePath(this.settings, date);
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) {
			return existing;
		}

		const folderPath = path.split("/").slice(0, -1).join("/");
		await ensureNestedFolder(this.app, folderPath);

		try {
			return await this.app.vault.create(path, createTimelineDayTemplate(date, nowIso));
		} catch (error) {
			const retry = this.app.vault.getAbstractFileByPath(path);
			if (retry instanceof TFile) {
				return retry;
			}

			new Notice("Unable to create timeline file.");
			throw error;
		}
	}

	private async readEntriesFromFile(file: TFile): Promise<ParsedTimelineEntry[]> {
		const markdown = await this.app.vault.cachedRead(file);
		return parseTimelineEntries(markdown).sort((left, right) =>
			right.meta.createdAt.localeCompare(left.meta.createdAt),
		);
	}

	private requireTimelineFile(sourcePath: string): TFile {
		const abstractFile = this.app.vault.getAbstractFileByPath(sourcePath);
		if (!(abstractFile instanceof TFile)) {
			throw new Error(`Timeline file not found: ${sourcePath}`);
		}

		return abstractFile;
	}
}

function combineContentAndEmbeds(content: string, attachments: TimelineEntryMeta["attachments"]): string {
	const trimmedContent = content.trim();
	const embedLines = buildAttachmentEmbeds(attachments);

	if (embedLines.length === 0) {
		return trimmedContent;
	}

	return [trimmedContent, ...embedLines].filter(Boolean).join("\n\n");
}

function determineEntryType(
	content: string,
	attachmentTypes: Array<"image" | "audio" | "file">,
): TimelineEntryType {
	if (attachmentTypes.length === 0) {
		return "checkin";
	}

	const uniqueTypes = Array.from(new Set(attachmentTypes));
	const firstType = uniqueTypes[0];
	if (uniqueTypes.length === 1 && firstType && !content.trim()) {
		return firstType;
	}

	return "mixed";
}

function stripLegacyTitle(meta: TimelineEntryMeta): TimelineEntryMeta {
	const cleaned = { ...(meta as TimelineEntryMeta & { title?: string }) };
	delete (cleaned as { title?: string }).title;
	return cleaned;
}

export function extractEditableMarkdownContent(
	blockMarkdown: string,
	attachments: TimelineAttachment[],
): string {
	let body = blockMarkdown
		.replace(/^##\s+.*$/m, "")
		.replace(/<!--\s*timeline-entry\s*[\s\S]*?\s*-->/, "")
		.trim();

	for (const embed of buildAttachmentEmbeds(attachments)) {
		const pattern = new RegExp(`(?:\\n\\s*)?${escapeRegExp(embed)}\\s*$`);
		body = body.replace(pattern, "").trimEnd();
	}

	return body.trim();
}

function cloneAttachments(attachments: TimelineAttachment[], timestamp: Date): TimelineAttachment[] {
	return attachments.map((attachment, index) => ({
		...attachment,
		id: createAttachmentId(timestamp, index + 1),
		createdAt: timestamp.toISOString(),
	}));
}

function currentSecondsTime(date: Date): string {
	const hours = `${date.getHours()}`.padStart(2, "0");
	const minutes = `${date.getMinutes()}`.padStart(2, "0");
	const seconds = `${date.getSeconds()}`.padStart(2, "0");
	return `${hours}:${minutes}:${seconds}`;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
