import { Modal, Notice, Setting, TextComponent } from "obsidian";

import type PersonalTimelinePlugin from "../../../main";
import type { ParsedTimelineEntry } from "../../../models/TimelineEntry";
import {
	extractEditableMarkdownContent,
	type TimelineEntryEditInput,
} from "../../../storage/timelineRepository";
import { parseTags } from "../../../utils/tags";
import { getErrorMessage } from "../utils/timelineErrors";

export class EditTimelineEntryModal extends Modal {
	private timeValue: string;
	private tagsValue: string;
	private contentValue: string;

	constructor(
		private readonly plugin: PersonalTimelinePlugin,
		private readonly sourcePath: string,
		private readonly entry: ParsedTimelineEntry,
	) {
		super(plugin.app);
		this.timeValue = entry.meta.time;
		this.tagsValue = entry.meta.tags.join(", ");
		this.contentValue = extractEditableMarkdownContent(
			entry.markdown,
			entry.meta.attachments,
		);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("timeline-edit-modal");

		contentEl.createEl("h2", { text: "Edit timeline entry" });

		const timeInput = createTextSetting(
			contentEl,
			"Time",
			this.timeValue,
			(value) => {
				this.timeValue = value;
			},
		);
		timeInput.inputEl.type = "time";

		const tagsInput = createTextSetting(
			contentEl,
			"Tags",
			this.tagsValue,
			(value) => {
				this.tagsValue = value;
			},
		);
		tagsInput.setPlaceholder("Work, reflection");

		const contentSetting = new Setting(contentEl)
			.setName("Content")
			.setDesc("Edit the Markdown body.");
		const textarea = contentSetting.controlEl.createEl("textarea", {
			cls: "timeline-modal-textarea",
		});
		textarea.value = this.contentValue;
		textarea.addEventListener("input", () => {
			this.contentValue = textarea.value;
		});

		const actions = contentEl.createDiv({ cls: "timeline-modal-actions" });
		const saveButton = actions.createEl("button", {
			text: "Save",
			cls: "mod-cta",
		});
		const cancelButton = actions.createEl("button", { text: "Cancel" });

		saveButton.addEventListener("click", () => {
			if (!/^\d{2}:\d{2}$/.test(this.timeValue)) {
				new Notice("Enter a valid time.");
				return;
			}

			saveButton.disabled = true;
			void this.handleSave(saveButton);
		});

		cancelButton.addEventListener("click", () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async handleSave(saveButton: HTMLButtonElement): Promise<void> {
		try {
			const input: TimelineEntryEditInput = {
				time: this.timeValue,
				content: this.contentValue,
				tags: parseTags(this.tagsValue),
			};
			await this.plugin.timelineRepository.updateEntry(
				this.sourcePath,
				this.entry.meta.id,
				input,
			);
			await this.plugin.timelineIndex.rebuild();
			await this.plugin.refreshTimelineViews();
			new Notice("Entry updated.");
			this.close();
		} catch (error) {
			new Notice(getErrorMessage(error, "Unable to update entry."));
			saveButton.disabled = false;
		}
	}
}

function createTextSetting(
	container: HTMLElement,
	name: string,
	value: string,
	onChange: (value: string) => void,
): TextComponent {
	let inputRef: TextComponent | null = null;
	const setting = new Setting(container).setName(name);
	setting.addText((text) => {
		inputRef = text;
		text.setValue(value).onChange(onChange);
	});
	if (!inputRef) {
		throw new Error(`Failed to create input for setting: ${name}`);
	}

	return inputRef;
}
