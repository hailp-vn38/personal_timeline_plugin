import { normalizePath } from "obsidian";

import type { TimelinePluginSettings } from "../models/TimelineSettings";

export function getTimelineFilePath(
	settings: TimelinePluginSettings,
	date: string,
): string {
	const year = date.slice(0, 4);
	const month = date.slice(5, 7);

	if (settings.fileOrganization === "flat") {
		return normalizePath(`${settings.timelineFolder}/${date}.md`);
	}

	if (settings.fileOrganization === "year") {
		return normalizePath(`${settings.timelineFolder}/${year}/${date}.md`);
	}

	return normalizePath(`${settings.timelineFolder}/${year}/${month}/${date}.md`);
}

export function getAttachmentFolderPath(date: string, attachmentFolder: string): string {
	const year = date.slice(0, 4);
	const month = date.slice(5, 7);

	return normalizePath(`${attachmentFolder}/${year}/${month}`);
}

export function getAttachmentPath(
	settings: TimelinePluginSettings,
	date: string,
	filename: string,
): string {
	return normalizePath(`${getAttachmentFolderPath(date, settings.attachmentFolder)}/${filename}`);
}
