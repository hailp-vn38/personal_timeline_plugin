import type { TimelinePluginSettings } from "../models/TimelineSettings";

export const DEFAULT_SETTINGS: TimelinePluginSettings = {
	timelineFolder: "Timeline",
	attachmentFolder: "Timeline Attachments",
	fileOrganization: "year-month",
	defaultView: "today",
	timeFormat: "24h",
	showMetadataInReadingView: true,
	metadataReadingViewMode: "summary",
};
