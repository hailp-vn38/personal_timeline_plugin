import { ItemView, Menu, Modal, Notice, Setting, TFile, TextComponent, WorkspaceLeaf } from "obsidian";

import { filterTimeline, type TimelineDatePreset, type TimelineFilterState } from "../index/filterTimeline";
import type PersonalTimelinePlugin from "../main";
import type { TimelineAttachment } from "../models/TimelineAttachment";
import type { ParsedTimelineEntry, TimelineIndexItem } from "../models/TimelineEntry";
import {
	createPendingAttachmentFromFile,
	getAudioExtension,
	type PendingQuickAttachment,
	revokePreview,
} from "../quick-check-in/pendingAttachments";
import { extractEditableMarkdownContent, type TimelineEntryEditInput } from "../storage/timelineRepository";
import { canCreateQuickCheckIn, parseTags } from "../utils/tags";
import { formatDateForFile, getNow } from "../utils/date";

export const VIEW_TYPE_TIMELINE = "personal-timeline-view";

export class TimelineView extends ItemView {
	private static readonly SEARCH_DEBOUNCE_MS = 180;
	private static readonly MAX_RENDERED_ENTRIES = 200;

	private readonly plugin: PersonalTimelinePlugin;
	private filters: TimelineFilterState = {
		searchTerm: "",
		selectedTag: "",
		startTime: "",
		endTime: "",
		datePreset: "today",
		customDate: formatDateForFile(getNow()),
	};

	private composerTags = "";
	private composerContent = "";
	private pendingAttachments: PendingQuickAttachment[] = [];
	private isComposerExpanded = false;
	private isSearchExpanded = false;
	private isFilterExpanded = false;
	private mediaRecorder: MediaRecorder | null = null;
	private audioChunks: Blob[] = [];
	private isRecording = false;
	private searchDebounceHandle: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: PersonalTimelinePlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_TIMELINE;
	}

	getDisplayText(): string {
		return "Personal timeline";
	}

	getIcon(): string {
		return "list-todo";
	}

	async onOpen(): Promise<void> {
		await this.render();
	}

	async onClose(): Promise<void> {
		this.clearSearchDebounce();
		this.releasePreviewUrls();
		this.contentEl.empty();
	}

	async refresh(): Promise<void> {
		await this.render();
	}

	private async render(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("personal-timeline-view");
		const allItems = this.plugin.timelineIndex.getAll();
		const today = formatDateForFile(getNow());
		const filteredItems = filterTimeline(allItems, this.filters, today);
		const activeDate = this.getActiveDate(today);

		const header = contentEl.createDiv({ cls: "timeline-header" });
		const headerText = header.createDiv({ cls: "timeline-header-text" });
		headerText.createEl("h2", { text: "Personal timeline" });
		headerText.createEl("div", { cls: "timeline-date-label", text: describeDatePreset(this.filters, activeDate) });
		const openDayButton = header.createEl("button", { text: "Open today note", cls: "timeline-header-button" });
		openDayButton.addEventListener("click", () => {
			void this.handleOpenSelectedSource(activeDate);
		});

		const malformedEntryCount = this.plugin.timelineIndex.getMalformedEntryCount();
		if (malformedEntryCount > 0) {
			contentEl.createEl("div", {
				cls: "timeline-warning-banner",
				text: `${malformedEntryCount} timeline entr${malformedEntryCount === 1 ? "y has" : "ies have"} invalid metadata and ${malformedEntryCount === 1 ? "was" : "were"} skipped.`,
			});
		}

		this.renderComposer(contentEl, today);
		this.renderToolbar(contentEl, allItems, today);

		const listSection = contentEl.createDiv({ cls: "timeline-list-section" });
		listSection.createEl("div", {
			cls: "timeline-list-summary",
			text: `${describeDatePreset(this.filters, activeDate)} · ${filteredItems.length} entr${filteredItems.length === 1 ? "y" : "ies"}`,
		});

		if (filteredItems.length === 0) {
			listSection.createEl("p", {
				cls: "timeline-empty-state",
				text: "No check-ins match the current filters.",
			});
			return;
		}

		const renderedItems = filteredItems.slice(0, TimelineView.MAX_RENDERED_ENTRIES);
		if (filteredItems.length > renderedItems.length) {
			listSection.createEl("p", {
				cls: "timeline-list-summary",
				text: `Showing ${renderedItems.length} of ${filteredItems.length} entries. Narrow your filters to see more.`,
			});
		}

		const list = listSection.createDiv({ cls: "timeline-list pt-timeline-list" });
		for (const [date, entries] of groupEntriesByDate(renderedItems)) {
			this.renderDayGroup(list, date, entries, today);
		}
	}

	private renderToolbar(container: HTMLElement, items: TimelineIndexItem[], today: string): void {
		const toolbar = container.createDiv({ cls: "timeline-toolbar" });
		const summaryRow = toolbar.createDiv({ cls: "timeline-toolbar-row" });
		summaryRow.createDiv({
			cls: "timeline-toolbar-summary",
			text: `${describeDatePreset(this.filters, this.getActiveDate(today))} · ${filterTimeline(items, this.filters, today).length} entries`,
		});

		const controls = summaryRow.createDiv({ cls: "timeline-toolbar-controls" });
		const searchToggleButton = controls.createEl("button", {
			text: this.isSearchExpanded ? "Close search" : "Search",
			cls: "timeline-filter-toggle",
		});
		searchToggleButton.addEventListener("click", () => {
			this.isSearchExpanded = !this.isSearchExpanded;
			if (!this.isSearchExpanded && this.filters.searchTerm) {
				this.filters.searchTerm = "";
			}
			void this.refresh();
		});

		const filtersToggleButton = controls.createEl("button", {
			text: this.isFilterExpanded ? "Close filter" : "Filter",
			cls: "timeline-filter-toggle",
		});
		filtersToggleButton.addEventListener("click", () => {
			this.isFilterExpanded = !this.isFilterExpanded;
			void this.refresh();
		});

		if (this.isSearchExpanded) {
			const searchInput = toolbar.createEl("input", {
				type: "search",
				placeholder: "Search text, content, tags...",
			});
			searchInput.addClass("timeline-input");
			searchInput.value = this.filters.searchTerm;
			searchInput.addEventListener("input", () => {
				this.scheduleSearchUpdate(searchInput.value);
			});
		}

		if (!this.isFilterExpanded) {
			return;
		}

		const filtersRow = toolbar.createDiv({ cls: "timeline-filter-row" });

		const datePresetSelect = filtersRow.createEl("select");
		datePresetSelect.addClass("timeline-select");
		addOption(datePresetSelect, "today", "Today");
		addOption(datePresetSelect, "yesterday", "Yesterday");
		addOption(datePresetSelect, "this-week", "This week");
		addOption(datePresetSelect, "custom", "Custom day");
		datePresetSelect.value = this.filters.datePreset;
		datePresetSelect.addEventListener("change", () => {
			this.filters.datePreset = datePresetSelect.value as TimelineDatePreset;
			if (this.filters.datePreset === "today") {
				this.filters.customDate = today;
			}
			void this.refresh();
		});

		const tagSelect = filtersRow.createEl("select");
		tagSelect.addClass("timeline-select");
		addOption(tagSelect, "", "All tags");
		for (const tag of this.plugin.timelineIndex.getAvailableTags()) {
			addOption(tagSelect, tag, `#${tag}`);
		}
		tagSelect.value = this.filters.selectedTag;
		tagSelect.addEventListener("change", () => {
			this.filters.selectedTag = tagSelect.value;
			void this.refresh();
		});

		if (this.filters.datePreset === "custom" || this.isFilterExpanded) {
			const advancedFilters = toolbar.createDiv({ cls: "timeline-filter-advanced" });
			if (this.filters.datePreset === "custom") {
				const customDateInput = advancedFilters.createEl("input", {
					type: "date",
				});
				customDateInput.addClass("timeline-input");
				customDateInput.value = this.filters.customDate;
				customDateInput.addEventListener("change", () => {
					this.filters.customDate = customDateInput.value || today;
					void this.refresh();
				});
			}

			const timeRow = advancedFilters.createDiv({ cls: "timeline-filter-time-row" });
			const startTimeInput = timeRow.createEl("input", { type: "time" });
			startTimeInput.addClass("timeline-input");
			startTimeInput.value = this.filters.startTime;
			startTimeInput.addEventListener("change", () => {
				this.filters.startTime = startTimeInput.value;
				void this.refresh();
			});

			const endTimeInput = timeRow.createEl("input", { type: "time" });
			endTimeInput.addClass("timeline-input");
			endTimeInput.value = this.filters.endTime;
			endTimeInput.addEventListener("change", () => {
				this.filters.endTime = endTimeInput.value;
				void this.refresh();
			});
		}

	}

	private renderComposer(container: HTMLElement, today: string): void {
		const composer = container.createDiv({ cls: "timeline-composer" });
		if (!this.isComposerExpanded) {
			const collapsedButton = composer.createEl("button", {
				cls: "timeline-composer-collapsed",
			});
			collapsedButton.createSpan({ text: this.composerContent.trim() ? this.composerContent.trim() : "Quick check-in..." });
			collapsedButton.createSpan({ cls: "timeline-composer-plus", text: "+" });
			collapsedButton.addEventListener("click", () => {
				this.isComposerExpanded = true;
				void this.refresh();
			});
			return;
		}

		const contentInput = composer.createEl("textarea", {
			placeholder: "What happened?",
		});
		contentInput.addClass("timeline-textarea");
		contentInput.value = this.composerContent;
		contentInput.addEventListener("input", () => {
			this.composerContent = contentInput.value;
		});
		contentInput.addEventListener("paste", (event) => {
			void this.handlePaste(event);
		});

		const controls = composer.createDiv({ cls: "timeline-composer-inline" });
		const tagsInput = controls.createEl("input", {
			type: "text",
			placeholder: "#tags",
		});
		tagsInput.addClass("timeline-input");
		tagsInput.addClass("timeline-tags-input");
		tagsInput.value = this.composerTags;
		tagsInput.addEventListener("input", () => {
			this.composerTags = tagsInput.value;
		});

		const attachmentActions = controls.createDiv({ cls: "timeline-composer-actions" });
		const addImageButton = attachmentActions.createEl("button", { text: "Add image" });
		const addFileButton = attachmentActions.createEl("button", { text: "Add file" });
		const recordAudioButton = attachmentActions.createEl("button", {
			text: this.isRecording ? "Stop recording" : "Record audio",
		});

		const imageInput = composer.createEl("input", {
			type: "file",
		});
		imageInput.accept = "image/*";
		imageInput.multiple = true;
		imageInput.addClass("timeline-hidden-input");

		const fileInput = composer.createEl("input", {
			type: "file",
		});
		fileInput.multiple = true;
		fileInput.addClass("timeline-hidden-input");

		addImageButton.addEventListener("click", () => imageInput.click());
		addFileButton.addEventListener("click", () => fileInput.click());
		recordAudioButton.addEventListener("click", () => {
			if (this.isRecording) {
				this.stopRecording();
				return;
			}

			void this.startRecording();
		});

		imageInput.addEventListener("change", () => {
			if (imageInput.files) {
				void this.addPendingFiles(Array.from(imageInput.files), "image");
				imageInput.value = "";
			}
		});

		fileInput.addEventListener("change", () => {
			if (fileInput.files) {
				void this.addPendingFiles(Array.from(fileInput.files), "file");
				fileInput.value = "";
			}
		});

		const actions = controls.createDiv({ cls: "timeline-composer-actions" });
		const collapseButton = actions.createEl("button", { text: "Cancel" });
		collapseButton.addEventListener("click", () => {
			this.handleCollapseComposer();
		});
		const submitButton = actions.createEl("button", {
			text: "Send",
			cls: "mod-cta",
		});

		submitButton.addEventListener("click", () => {
			void this.handleSubmit(today, submitButton);
		});

		if (this.pendingAttachments.length > 0) {
			this.renderPendingAttachments(composer);
		}
	}

	private renderPendingAttachments(container: HTMLElement): void {
		const section = container.createDiv({ cls: "timeline-pending-section" });
		const summaryRow = section.createDiv({ cls: "timeline-pending-header" });
		summaryRow.createEl("div", {
			cls: "timeline-pending-title",
			text: `📎 ${this.pendingAttachments.length} attachment${this.pendingAttachments.length === 1 ? "" : "s"}`,
		});
		const clearButton = summaryRow.createEl("button", { text: "Clear" });
		clearButton.addEventListener("click", () => {
			this.releasePreviewUrls();
			this.pendingAttachments = [];
			void this.refresh();
		});

		const list = section.createDiv({ cls: "timeline-pending-list" });
		this.pendingAttachments.forEach((attachment, index) => {
			const card = list.createDiv({ cls: "timeline-pending-card" });
			card.createEl("strong", { text: attachment.name });
			card.createEl("div", {
				cls: "timeline-pending-meta",
				text: `${attachment.type}${attachment.mime ? ` • ${attachment.mime}` : ""}`,
			});

			if (attachment.type === "image" && attachment.previewUrl) {
				card.createEl("img", {
					cls: "timeline-attachment-image",
					attr: { src: attachment.previewUrl, alt: attachment.name },
				});
			}

			if (attachment.type === "audio" && attachment.previewUrl) {
				const audio = card.createEl("audio", {
					cls: "timeline-attachment-audio",
				});
				audio.controls = true;
				audio.src = attachment.previewUrl;
			}

			const removeButton = card.createEl("button", { text: "Remove" });
			removeButton.addEventListener("click", () => {
				const target = this.pendingAttachments[index];
				if (!target) {
					return;
				}

				revokePreview(target);
				this.pendingAttachments.splice(index, 1);
				void this.refresh();
			});
		});
	}

	private renderDayGroup(container: HTMLElement, date: string, entries: TimelineIndexItem[], today: string): void {
		const groupEl = container.createDiv({ cls: "pt-day-group" });
		groupEl.createDiv({
			cls: "pt-day-header",
			text: formatDayHeader(date, today),
		});

		const timelineEl = groupEl.createDiv({ cls: "pt-timeline" });
		entries.forEach((entry, index) => {
			this.renderTimelineEntry(timelineEl, entry, index === entries.length - 1);
		});
	}

	private renderTimelineEntry(container: HTMLElement, item: TimelineIndexItem, isLast: boolean): void {
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
			this.openEntryMenu(event, item);
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
				tagsEl.createSpan({ cls: "pt-tag", text: tag.startsWith("#") ? tag : `#${tag}` });
			}
		}

		if (item.attachments.length > 0) {
			this.renderVerticalAttachmentSection(mainEl, item.attachments);
		}
	}

	private renderVerticalAttachmentSection(
		container: HTMLElement,
		attachments: TimelineAttachment[],
	): void {
		const imageAttachments = attachments.filter((attachment) => attachment.type === "image");
		const audioAttachments = attachments.filter((attachment) => attachment.type === "audio");
		const fileAttachments = attachments.filter((attachment) => attachment.type === "file");
		const summaryParts: string[] = [];

		if (imageAttachments.length > 0) {
			summaryParts.push(`🖼 ${imageAttachments.length}`);
		}

		if (audioAttachments.length > 0) {
			summaryParts.push(`🎙 ${audioAttachments.length}`);
		}

		if (fileAttachments.length > 0) {
			summaryParts.push(`📄 ${fileAttachments.length}`);
		}

		if (summaryParts.length === 0) {
			return;
		}

		const summary = container.createDiv({ cls: "pt-entry-attachments" });
		summary.setText(`📎 ${attachments.length} attachments · ${summaryParts.join(" · ")}`);

		const detailList = container.createDiv({ cls: "pt-expanded-attachments" });
		if (imageAttachments.length > 0) {
			const imageGrid = detailList.createDiv({ cls: "timeline-attachment-image-grid" });
			for (const attachment of imageAttachments) {
				const abstractFile = this.plugin.app.vault.getAbstractFileByPath(attachment.path);
				if (!(abstractFile instanceof TFile)) {
					continue;
				}

				const resourcePath = this.plugin.app.vault.getResourcePath(abstractFile);
				const displayName = attachment.name ?? abstractFile.name;
				imageGrid.createEl("img", {
					cls: "timeline-attachment-image",
					attr: { src: resourcePath, alt: displayName },
				});
			}
		}

		for (const attachment of audioAttachments) {
			const abstractFile = this.plugin.app.vault.getAbstractFileByPath(attachment.path);
			if (!(abstractFile instanceof TFile)) {
				detailList.createEl("div", {
					cls: "timeline-attachment-missing",
					text: `Missing attachment: ${attachment.name ?? "Unknown file"}`,
				});
				continue;
			}

			const resourcePath = this.plugin.app.vault.getResourcePath(abstractFile);
			const displayName = attachment.name ?? abstractFile.name;
			detailList.createEl("div", {
				cls: "pt-expanded-attachment",
				text: `🎙 ${displayName}`,
			});
			const audio = detailList.createEl("audio", { cls: "timeline-attachment-audio pt-audio-player" });
			audio.controls = true;
			audio.src = resourcePath;
		}
	}

	private async addPendingFiles(files: File[], typeHint: "image" | "file"): Promise<void> {
		for (const file of files) {
			this.pendingAttachments.push(await createPendingAttachmentFromFile(file, typeHint));
		}
		await this.refresh();
	}

	private async handlePaste(event: ClipboardEvent): Promise<void> {
		const clipboardItems = Array.from(event.clipboardData?.items ?? []);
		const imageItems = clipboardItems.filter((item) => item.type.startsWith("image/"));
		if (imageItems.length === 0) {
			return;
		}

		event.preventDefault();
		for (const item of imageItems) {
			const blob = item.getAsFile();
			if (!blob) {
				continue;
			}

			const file = new File([blob], `pasted-image-${Date.now()}.png`, {
				type: blob.type || "image/png",
			});
			this.pendingAttachments.push(await createPendingAttachmentFromFile(file, "image"));
		}
		await this.refresh();
	}

	private async startRecording(): Promise<void> {
		if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
			new Notice("Audio recording is not supported in this environment.");
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			this.audioChunks = [];
			this.mediaRecorder = new MediaRecorder(stream);
			this.isRecording = true;
			this.mediaRecorder.addEventListener("dataavailable", (event) => {
				if (event.data.size > 0) {
					this.audioChunks.push(event.data);
				}
			});
			this.mediaRecorder.addEventListener("stop", () => {
				const blob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || "audio/webm" });
				const extension = getAudioExtension(blob.type);
				const file = new File([blob], `recording-${Date.now()}${extension}`, {
					type: blob.type,
				});
				void this.finishRecording(file, stream);
			});
			this.mediaRecorder.start();
			await this.refresh();
		} catch {
			this.isRecording = false;
			new Notice("Unable to start audio recording.");
		}
	}

	private stopRecording(): void {
		if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
			return;
		}

		this.mediaRecorder.stop();
	}

	private clearComposer(): void {
		this.composerTags = "";
		this.composerContent = "";
		this.releasePreviewUrls();
		this.pendingAttachments = [];
		this.isComposerExpanded = false;
	}

	private releasePreviewUrls(): void {
		for (const attachment of this.pendingAttachments) {
			revokePreview(attachment);
		}
	}

	private async handleSubmit(today: string, submitButton: HTMLButtonElement): Promise<void> {
		const parsedTags = parseTags(this.composerTags);
		if (!canCreateQuickCheckIn(this.composerContent, parsedTags, this.pendingAttachments)) {
			new Notice("Nothing to save.");
			return;
		}

		submitButton.disabled = true;
		try {
			const targetDate = this.getComposerDate(today);
			await this.plugin.timelineRepository.createTextEntry(
				{
					content: this.composerContent,
					tags: parsedTags,
					type: "checkin",
					source: "quick-capture",
					attachments: [],
				},
				new Date(`${targetDate}T${currentTimeForComposer()}:00`),
				this.pendingAttachments.map((attachment) => ({
					type: attachment.type,
					name: attachment.name,
					mime: attachment.mime,
					data: attachment.data,
				})),
			);
			await this.plugin.timelineIndex.rebuild();
			this.clearComposer();
			await this.refresh();
		} finally {
			submitButton.disabled = false;
		}
	}

	private async handleOpenSelectedSource(activeDate: string): Promise<void> {
		const file = await this.plugin.timelineRepository.getTimelineFileForDate(activeDate);
		if (!file) {
			new Notice("No timeline file exists for the selected day yet.");
			return;
		}

		await this.plugin.openTimelineSource(file);
	}

	private async handleEditEntry(item: TimelineIndexItem): Promise<void> {
		const entry = await this.plugin.timelineRepository.getEntryById(item.sourcePath, item.id);
		if (!entry) {
			new Notice("Timeline entry is unavailable.");
			return;
		}

		new EditEntryModal(this.plugin, item.sourcePath, entry).open();
	}

	private async handleDuplicateEntry(item: TimelineIndexItem): Promise<void> {
		try {
			await this.plugin.timelineRepository.duplicateEntry(item.sourcePath, item.id);
			await this.plugin.timelineIndex.rebuild();
			await this.refresh();
			new Notice("Entry duplicated.");
		} catch (error) {
			new Notice(getErrorMessage(error, "Unable to duplicate entry."));
		}
	}

	private async handleDeleteEntry(item: TimelineIndexItem): Promise<void> {
		const confirmed = await confirmAction(
			this.plugin,
			"Delete timeline entry",
			"Delete this timeline entry? Attachments will not be removed automatically.",
			"Delete",
		);
		if (!confirmed) {
			return;
		}

		try {
			await this.plugin.timelineRepository.deleteEntry(item.sourcePath, item.id);
			await this.plugin.timelineIndex.rebuild();
			await this.refresh();
			new Notice("Entry deleted.");
		} catch (error) {
			new Notice(getErrorMessage(error, "Unable to delete entry."));
		}
	}

	private async finishRecording(file: File, stream: MediaStream): Promise<void> {
		this.pendingAttachments.push(await createPendingAttachmentFromFile(file, "audio"));
		stream.getTracks().forEach((track) => track.stop());
		this.mediaRecorder = null;
		this.audioChunks = [];
		this.isRecording = false;
		await this.refresh();
	}

	private scheduleSearchUpdate(value: string): void {
		this.filters.searchTerm = value;
		this.clearSearchDebounce();
		this.searchDebounceHandle = window.setTimeout(() => {
			this.searchDebounceHandle = null;
			void this.refresh();
		}, TimelineView.SEARCH_DEBOUNCE_MS);
	}

	private clearSearchDebounce(): void {
		if (this.searchDebounceHandle !== null) {
			window.clearTimeout(this.searchDebounceHandle);
			this.searchDebounceHandle = null;
		}
	}

	private getActiveDate(today: string): string {
		switch (this.filters.datePreset) {
			case "today":
				return today;
			case "yesterday":
				return shiftDate(today, -1);
			case "this-week":
				return today;
			case "custom":
				return this.filters.customDate || today;
			default:
				return today;
		}
	}

	private getComposerDate(today: string): string {
		return this.filters.datePreset === "custom" && this.filters.customDate
			? this.filters.customDate
			: today;
	}

	private handleCollapseComposer(): void {
		if (this.composerTags.trim() || this.composerContent.trim() || this.pendingAttachments.length > 0) {
			void confirmAction(
				this.plugin,
				"Discard draft",
				"Discard the current quick check-in draft?",
				"Discard",
			).then((confirmed) => {
				if (!confirmed) {
					return;
				}

				this.clearComposer();
				void this.refresh();
			});
			return;
		}

		this.isComposerExpanded = false;
		void this.refresh();
	}

	private openEntryMenu(event: MouseEvent, item: TimelineIndexItem): void {
		const menu = new Menu();
		menu.addItem((menuItem) =>
			menuItem.setTitle("Edit").setIcon("pencil").onClick(() => {
				void this.handleEditEntry(item);
			}),
		);
		menu.addItem((menuItem) =>
			menuItem.setTitle("Duplicate").setIcon("copy").onClick(() => {
				void this.handleDuplicateEntry(item);
			}),
		);
		menu.addItem((menuItem) =>
			menuItem.setTitle("Open source").setIcon("external-link").onClick(() => {
				const file = this.plugin.app.vault.getAbstractFileByPath(item.sourcePath);
				if (file instanceof TFile) {
					void this.plugin.openTimelineSource(file, item.id);
				} else {
					new Notice("Source file is unavailable.");
				}
			}),
		);
		menu.addSeparator();
		menu.addItem((menuItem) =>
			menuItem.setTitle("Delete").setIcon("trash").onClick(() => {
				void this.handleDeleteEntry(item);
			}),
		);
		menu.showAtMouseEvent(event);
	}
}

function addOption(select: HTMLSelectElement, value: string, label: string): void {
	select.createEl("option", { value, text: label });
}

function currentTimeForComposer(): string {
	const now = new Date();
	return `${`${now.getHours()}`.padStart(2, "0")}:${`${now.getMinutes()}`.padStart(2, "0")}`;
}

function shiftDate(dateText: string, days: number): string {
	const date = new Date(`${dateText}T00:00:00`);
	date.setDate(date.getDate() + days);
	return [
		date.getFullYear(),
		`${date.getMonth() + 1}`.padStart(2, "0"),
		`${date.getDate()}`.padStart(2, "0"),
	].join("-");
}

function describeDatePreset(filters: TimelineFilterState, activeDate: string): string {
	switch (filters.datePreset) {
		case "today":
			return "Today";
		case "yesterday":
			return "Yesterday";
		case "this-week":
			return "This week";
		case "custom":
			return activeDate;
		default:
			return activeDate;
	}
}

function groupEntriesByDate(entries: TimelineIndexItem[]): Array<[string, TimelineIndexItem[]]> {
	const groups = new Map<string, TimelineIndexItem[]>();

	for (const entry of entries) {
		const list = groups.get(entry.date) ?? [];
		list.push(entry);
		groups.set(entry.date, list);
	}

	for (const list of groups.values()) {
		list.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
	}

	return [...groups.entries()].sort(([left], [right]) => right.localeCompare(left));
}

function formatDisplayDate(date: string): string {
	const [year, month, day] = date.split("-");
	return `${Number(day)}/${Number(month)}/${year}`;
}

function formatDayHeader(date: string, today: string): string {
	if (date === today) {
		return "Today";
	}

	return formatDisplayDate(date);
}

function getDotClass(type?: TimelineIndexItem["type"]): string {
	switch (type) {
		case "note":
			return "pt-dot-note";
		case "image":
			return "pt-dot-image";
		case "audio":
			return "pt-dot-audio";
		case "file":
			return "pt-dot-file";
		case "mixed":
			return "pt-dot-mixed";
		case "checkin":
		default:
			return "pt-dot-checkin";
	}
}

class EditEntryModal extends Modal {
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
		this.contentValue = extractEditableMarkdownContent(entry.markdown, entry.meta.attachments);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("timeline-edit-modal");

		contentEl.createEl("h2", { text: "Edit timeline entry" });

		const timeInput = createTextSetting(contentEl, "Time", this.timeValue, (value) => {
			this.timeValue = value;
		});
		timeInput.inputEl.type = "time";

		const tagsInput = createTextSetting(contentEl, "Tags", this.tagsValue, (value) => {
			this.tagsValue = value;
		});
		tagsInput.setPlaceholder("Work, reflection");

		const contentSetting = new Setting(contentEl).setName("Content").setDesc("Edit the Markdown body.");
		const textarea = contentSetting.controlEl.createEl("textarea", {
			cls: "timeline-modal-textarea",
		});
		textarea.value = this.contentValue;
		textarea.addEventListener("input", () => {
			this.contentValue = textarea.value;
		});

		const actions = contentEl.createDiv({ cls: "timeline-modal-actions" });
		const saveButton = actions.createEl("button", { text: "Save", cls: "mod-cta" });
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
			await this.plugin.timelineRepository.updateEntry(this.sourcePath, this.entry.meta.id, input);
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

function getErrorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

function confirmAction(
	plugin: PersonalTimelinePlugin,
	title: string,
	message: string,
	confirmLabel: string,
): Promise<boolean> {
	return new Promise((resolve) => {
		new ConfirmActionModal(plugin, title, message, confirmLabel, resolve).open();
	});
}

class ConfirmActionModal extends Modal {
	constructor(
		private readonly plugin: PersonalTimelinePlugin,
		private readonly title: string,
		private readonly message: string,
		private readonly confirmLabel: string,
		private readonly onResolve: (confirmed: boolean) => void,
	) {
		super(plugin.app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("timeline-edit-modal");
		contentEl.createEl("h2", { text: this.title });
		contentEl.createEl("p", { text: this.message });

		const actions = contentEl.createDiv({ cls: "timeline-modal-actions" });
		const cancelButton = actions.createEl("button", { text: "Cancel" });
		const confirmButton = actions.createEl("button", {
			text: this.confirmLabel,
			cls: "mod-warning",
		});

		cancelButton.addEventListener("click", () => {
			this.onResolve(false);
			this.close();
		});
		confirmButton.addEventListener("click", () => {
			this.onResolve(true);
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
