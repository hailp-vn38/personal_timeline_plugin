import { App, TFile } from "obsidian";

import type { TimelineAttachment, TimelineAttachmentType } from "../models/TimelineAttachment";
import type { TimelinePluginSettings } from "../models/TimelineSettings";
import { createAttachmentId } from "../utils/id";

import { ensureNestedFolder } from "./folder";
import { getAttachmentFolderPath, getAttachmentPath } from "./timelinePaths";

export interface PendingAttachmentInput {
	type: TimelineAttachmentType;
	name: string;
	mime?: string;
	data: ArrayBuffer;
}

export async function persistAttachments(
	app: App,
	settings: TimelinePluginSettings,
	date: string,
	timestamp: Date,
	inputs: PendingAttachmentInput[],
): Promise<TimelineAttachment[]> {
	if (inputs.length === 0) {
		return [];
	}

	const folderPath = getAttachmentFolderPath(date, settings.attachmentFolder);
	await ensureNestedFolder(app, folderPath);

	const attachments: TimelineAttachment[] = [];
	for (let index = 0; index < inputs.length; index++) {
		const input = inputs[index];
		if (!input) {
			continue;
		}

		const filename = await createUniqueAttachmentFilename(
			app,
			settings,
			date,
			timestamp,
			index + 1,
			input.name,
		);
		const path = getAttachmentPath(settings, date, filename);
		const file = await app.vault.createBinary(path, input.data);
		attachments.push(createAttachmentMeta(input, file, timestamp, index + 1));
	}

	return attachments;
}

export function buildAttachmentEmbeds(attachments: TimelineAttachment[]): string[] {
	return attachments.map((attachment) => {
		if (attachment.type === "file") {
			return `[[${attachment.path}]]`;
		}

		return `![[${attachment.path}]]`;
	});
}

function createAttachmentMeta(
	input: PendingAttachmentInput,
	file: TFile,
	timestamp: Date,
	index: number,
): TimelineAttachment {
	return {
		id: createAttachmentId(timestamp, index),
		type: input.type,
		path: file.path,
		name: file.name,
		mime: input.mime,
		size: input.data.byteLength,
		createdAt: timestamp.toISOString(),
	};
}

async function createUniqueAttachmentFilename(
	app: App,
	settings: TimelinePluginSettings,
	date: string,
	timestamp: Date,
	index: number,
	originalName: string,
): Promise<string> {
	const extension = getExtension(originalName);
	const safeBase = sanitizeBaseName(removeExtension(originalName)) || "attachment";
	const prefix = date.replace(/-/g, "");
	const time = [
		`${timestamp.getHours()}`.padStart(2, "0"),
		`${timestamp.getMinutes()}`.padStart(2, "0"),
		`${timestamp.getSeconds()}`.padStart(2, "0"),
	].join("");

	let candidate = `${prefix}_${time}_${index}_${safeBase}${extension}`;
	let attempt = 1;

	while (app.vault.getAbstractFileByPath(getAttachmentPath(settings, date, candidate))) {
		candidate = `${prefix}_${time}_${index}_${safeBase}-${attempt}${extension}`;
		attempt += 1;
	}

	return candidate;
}

function removeExtension(filename: string): string {
	const index = filename.lastIndexOf(".");
	return index > 0 ? filename.slice(0, index) : filename;
}

function getExtension(filename: string): string {
	const index = filename.lastIndexOf(".");
	return index > 0 ? filename.slice(index) : "";
}

function sanitizeBaseName(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-_]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
