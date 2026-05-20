import { App, PluginSettingTab, Setting } from "obsidian";

import type PersonalTimelinePlugin from "../main";
import type {
	TimelineDefaultView,
	TimelineFileOrganization,
	TimelineMetadataReadingViewMode,
	TimelineTimeFormat,
} from "../models/TimelineSettings";

const FILE_ORGANIZATION_OPTIONS: Record<TimelineFileOrganization, string> = {
	flat: "Flat",
	year: "Year",
	"year-month": "Year / month",
};

const DEFAULT_VIEW_OPTIONS: Record<TimelineDefaultView, string> = {
	today: "Today",
	"last-opened": "Last opened",
};

const TIME_FORMAT_OPTIONS: Record<TimelineTimeFormat, string> = {
	"12h": "12-hour",
	"24h": "24-hour",
};

const METADATA_READING_VIEW_OPTIONS: Record<TimelineMetadataReadingViewMode, string> = {
	summary: "Summary",
	table: "Table",
	json: "Raw JSON",
};

export class TimelineSettingTab extends PluginSettingTab {
	plugin: PersonalTimelinePlugin;

	constructor(app: App, plugin: PersonalTimelinePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Personal timeline").setHeading();

		new Setting(containerEl)
			.setName("Timeline folder")
			.setDesc("Folder used to store daily timeline Markdown files.")
			.addText((text) =>
				text
					.setPlaceholder("Timeline")
					.setValue(this.plugin.settings.timelineFolder)
					.onChange(async (value) => {
						this.plugin.settings.timelineFolder = value.trim() || "Timeline";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Attachment folder")
			.setDesc("Folder used to store image, audio, and file attachments.")
			.addText((text) =>
					text
						.setPlaceholder("Timeline attachments")
						.setValue(this.plugin.settings.attachmentFolder)
					.onChange(async (value) => {
						this.plugin.settings.attachmentFolder =
							value.trim() || "Timeline Attachments";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("File organization")
			.setDesc("Choose how timeline files are grouped inside the vault.")
			.addDropdown((dropdown) => {
				for (const [value, label] of Object.entries(FILE_ORGANIZATION_OPTIONS)) {
					dropdown.addOption(value, label);
				}

				dropdown
					.setValue(this.plugin.settings.fileOrganization)
					.onChange(async (value: TimelineFileOrganization) => {
						this.plugin.settings.fileOrganization = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Default view")
			.setDesc("Choose which day opens when the timeline view is shown.")
			.addDropdown((dropdown) => {
				for (const [value, label] of Object.entries(DEFAULT_VIEW_OPTIONS)) {
					dropdown.addOption(value, label);
				}

				dropdown
					.setValue(this.plugin.settings.defaultView)
					.onChange(async (value: TimelineDefaultView) => {
						this.plugin.settings.defaultView = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Time format")
			.setDesc("Choose how times should be displayed in the plugin UI.")
			.addDropdown((dropdown) => {
				for (const [value, label] of Object.entries(TIME_FORMAT_OPTIONS)) {
					dropdown.addOption(value, label);
				}

				dropdown
					.setValue(this.plugin.settings.timeFormat)
					.onChange(async (value: TimelineTimeFormat) => {
						this.plugin.settings.timeFormat = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Show timeline metadata in reading view")
			.setDesc("Render hidden timeline JSON metadata inside Markdown reading view.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showMetadataInReadingView)
					.onChange(async (value) => {
						this.plugin.settings.showMetadataInReadingView = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Metadata reading view mode")
			.setDesc("Choose how metadata is displayed in Markdown reading view.")
			.addDropdown((dropdown) => {
				for (const [value, label] of Object.entries(METADATA_READING_VIEW_OPTIONS)) {
					dropdown.addOption(value, label);
				}

				dropdown
					.setValue(this.plugin.settings.metadataReadingViewMode)
					.onChange(async (value: TimelineMetadataReadingViewMode) => {
						this.plugin.settings.metadataReadingViewMode = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
