import {
	ItemView,
	Notice,
	TFile,
	WorkspaceLeaf,
	setIcon,
} from "obsidian";

import {
	filterTimeline,
	type TimelineFilterState,
} from "../index/filterTimeline";
import type PersonalTimelinePlugin from "../main";
import type { TimelineIndexItem } from "../models/TimelineEntry";
import { canCreateQuickCheckIn } from "../utils/tags";
import { formatDateForFile, getNow } from "../utils/date";
import { confirmAction } from "./timeline/modals/ConfirmTimelineActionModal";
import {
	createTimelineEntryActions,
} from "./timeline/actions/timelineEntryActions";
import { openTimelineEntryMenu } from "./timeline/actions/timelineMenu";
import {
	appendPendingFiles,
	appendPastedImages,
	mapPendingAttachmentsToInputs,
	releasePendingAttachmentPreviews,
} from "./timeline/composer/composerAttachments";
import {
	clearComposerDraft,
	commitComposerTagDraft,
	getComposerTags,
	hasComposerDraftChanges,
	removeComposerTag,
} from "./timeline/composer/composerDraft";
import {
	startComposerRecording,
	stopComposerRecording,
	stopComposerRecordingTracks,
} from "./timeline/composer/composerRecording";
import { renderComposerPanel } from "./timeline/composer/renderComposerPanel";
import type {
	ComposerDraftState,
	ComposerRecordingState,
} from "./timeline/composer/composerTypes";
import {
	currentTimeForComposer,
	describeDatePreset,
	shiftDate,
} from "./timeline/utils/timelineDates";
import {
	resetExpandedFilters,
	updateDatePreset,
} from "./timeline/utils/timelineFilterActions";
import { renderTimelineEntryAttachments } from "./timeline/render/renderTimelineEntryAttachments";
import { renderTimelineList } from "./timeline/render/renderTimelineList";
import { renderTimelineToolbar } from "./timeline/render/renderTimelineToolbar";

export const VIEW_TYPE_TIMELINE = "personal-timeline-view";

export class TimelineView extends ItemView {
	private static readonly SEARCH_DEBOUNCE_MS = 180;
	private static readonly MAX_RENDERED_ENTRIES = 200;

	private readonly plugin: PersonalTimelinePlugin;
	private readonly entryActions: ReturnType<typeof createTimelineEntryActions>;
	private filters: TimelineFilterState = {
		searchTerm: "",
		selectedTag: "",
		startTime: "",
		endTime: "",
		datePreset: "today",
		customDate: formatDateForFile(getNow()),
	};

	private readonly draftState: ComposerDraftState = {
		content: "",
		tagsValue: "",
		tagDraft: "",
		attachments: [],
	};
	private isComposerExpanded = false;
	private isSearchExpanded = false;
	private isFilterExpanded = false;
	private readonly recordingState: ComposerRecordingState = {
		mediaRecorder: null,
		audioChunks: [],
		isRecording: false,
	};
	private searchDebounceHandle: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: PersonalTimelinePlugin) {
		super(leaf);
		this.plugin = plugin;
		this.entryActions = createTimelineEntryActions({
			plugin,
		});
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
		stopComposerRecordingTracks(this.recordingState);
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
		headerText.createEl("div", {
			cls: "timeline-date-label",
			text: describeDatePreset(this.filters, activeDate),
		});
		const createButton = header.createEl("button", {
			cls: "timeline-header-button",
			attr: {
				type: "button",
				"aria-label": "Create check-in",
			},
		});
		setIcon(createButton, "plus");
		createButton.addEventListener("click", () => {
			this.isComposerExpanded = true;
			void this.refresh();
		});

		const malformedEntryCount =
			this.plugin.timelineIndex.getMalformedEntryCount();
		if (malformedEntryCount > 0) {
			contentEl.createEl("div", {
				cls: "timeline-warning-banner",
				text: `${malformedEntryCount} timeline entr${malformedEntryCount === 1 ? "y has" : "ies have"} invalid metadata and ${malformedEntryCount === 1 ? "was" : "were"} skipped.`,
			});
		}

		this.renderComposer(contentEl, today);
		this.renderToolbar(contentEl, allItems, today);

		const listSection = contentEl.createDiv({
			cls: "timeline-list-section",
		});
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

		const renderedItems = filteredItems.slice(
			0,
			TimelineView.MAX_RENDERED_ENTRIES,
		);
		if (filteredItems.length > renderedItems.length) {
			listSection.createEl("p", {
				cls: "timeline-list-summary",
				text: `Showing ${renderedItems.length} of ${filteredItems.length} entries. Narrow your filters to see more.`,
			});
		}

		const list = listSection.createDiv({
			cls: "timeline-list pt-timeline-list",
		});
		renderTimelineList(list, {
			items: renderedItems,
			today,
			selectedTag: this.filters.selectedTag,
			onTagToggle: (tag) => {
				this.handleTagFilterToggle(tag);
			},
			onOpenMenu: (event, item) => {
				openTimelineEntryMenu(event, item, this.entryActions);
			},
			renderAttachments: (entryContainer, attachments) => {
				this.renderEntryAttachments(entryContainer, attachments);
			},
		});
	}

	private renderToolbar(
		container: HTMLElement,
		items: TimelineIndexItem[],
		today: string,
	): void {
		renderTimelineToolbar(container, {
			filters: this.filters,
			today,
			summaryText: `${describeDatePreset(this.filters, this.getActiveDate(today))} · ${filterTimeline(items, this.filters, today).length} entries`,
			isSearchExpanded: this.isSearchExpanded,
			isFilterExpanded: this.isFilterExpanded,
			availableTags: this.plugin.timelineIndex.getAvailableTags(),
			onSearchToggle: () => {
				this.isSearchExpanded = !this.isSearchExpanded;
				if (!this.isSearchExpanded && this.filters.searchTerm) {
					this.filters.searchTerm = "";
				}
				void this.refresh();
			},
			onFilterToggle: () => {
				if (this.isFilterExpanded) {
					resetExpandedFilters(this.filters, today);
				}
				this.isFilterExpanded = !this.isFilterExpanded;
				void this.refresh();
			},
			onSearchInput: (value) => {
				this.scheduleSearchUpdate(value);
			},
			onDatePresetChange: (preset) => {
				updateDatePreset(this.filters, preset, today);
				void this.refresh();
			},
			onTagChange: (tag) => {
				this.filters.selectedTag = tag;
				void this.refresh();
			},
			onCustomDateChange: (value) => {
				this.filters.customDate = value;
				void this.refresh();
			},
			onStartTimeChange: (value) => {
				this.filters.startTime = value;
				void this.refresh();
			},
			onEndTimeChange: (value) => {
				this.filters.endTime = value;
				void this.refresh();
			},
		});
	}

	private renderComposer(container: HTMLElement, today: string): void {
		if (!this.isComposerExpanded) {
			return;
		}

		renderComposerPanel(container, {
			rootClassName: "timeline-composer",
			contentPlaceholder: "Hãy nhập",
			tagsPlaceholder: "# Add tags",
			cancelLabel: "Cancel",
			submitLabel: "Send",
			draftState: this.draftState,
			recordingState: this.recordingState,
			onDraftRefresh: () => {
				void this.refresh();
			},
			onCommitTagDraft: () => this.commitComposerTagDraft(),
			onRemoveTag: (tag) => {
				this.removeComposerTag(tag);
			},
			onAddFiles: async (files, typeHint) => {
				await this.addPendingFiles(files, typeHint);
			},
			onToggleRecording: () => {
				if (this.recordingState.isRecording) {
					this.stopRecording();
					return;
				}

				void this.startRecording();
			},
			onPaste: async (event) => {
				await this.handlePaste(event);
			},
			onCancel: () => {
				this.handleCollapseComposer();
			},
			onSubmit: async (submitButton) => {
				await this.handleSubmit(today, submitButton);
			},
		});
	}

	private renderEntryAttachments(
		container: HTMLElement,
		attachments: Parameters<typeof renderTimelineEntryAttachments>[1],
	): void {
		renderTimelineEntryAttachments(container, attachments, {
			getFileByPath: (path) => {
				const file = this.plugin.app.vault.getAbstractFileByPath(path);
				return file instanceof TFile ? file : null;
			},
			getResourcePath: (file) => this.plugin.app.vault.getResourcePath(file),
		});
	}

	private async addPendingFiles(
		files: File[],
		typeHint: "image" | "file",
	): Promise<void> {
		await appendPendingFiles(this.draftState.attachments, files, typeHint);
		await this.refresh();
	}

	private async handlePaste(event: ClipboardEvent): Promise<void> {
		const handled = await appendPastedImages(this.draftState.attachments, event);
		if (!handled) {
			return;
		}
		await this.refresh();
	}

	private async startRecording(): Promise<void> {
		await startComposerRecording({
			state: this.recordingState,
			onUnsupported: () => {
				new Notice("Audio recording is not supported in this environment.");
			},
			onError: () => {
				new Notice("Unable to start audio recording.");
			},
			onReady: async (file, stream) => {
				await this.finishRecording(file, stream);
			},
			onStateChanged: async () => {
				await this.refresh();
			},
		});
	}

	private stopRecording(): void {
		stopComposerRecording(this.recordingState);
	}

	private clearComposer(): void {
		this.releasePreviewUrls();
		clearComposerDraft(this.draftState);
		this.isComposerExpanded = false;
	}

	private releasePreviewUrls(): void {
		releasePendingAttachmentPreviews(this.draftState.attachments);
	}

	private async handleSubmit(
		today: string,
		submitButton: HTMLButtonElement,
	): Promise<void> {
		this.commitComposerTagDraft();
		const parsedTags = this.getComposerTags();
		if (
			!canCreateQuickCheckIn(
				this.draftState.content,
				parsedTags,
				this.draftState.attachments,
			)
		) {
			new Notice("Nothing to save.");
			return;
		}

		try {
			const targetDate = this.getComposerDate(today);
			await this.plugin.timelineRepository.createTextEntry(
				{
					content: this.draftState.content,
					tags: parsedTags,
					type: "checkin",
					source: "quick-capture",
					attachments: [],
				},
				new Date(`${targetDate}T${currentTimeForComposer()}:00`),
				mapPendingAttachmentsToInputs(this.draftState.attachments),
			);
			await this.plugin.timelineIndex.rebuild();
			this.clearComposer();
			await this.refresh();
		} finally {
			// Shared composer panel owns submit button locking.
		}
	}

	private async finishRecording(
		file: File,
		stream: MediaStream,
	): Promise<void> {
		await appendPendingFiles(this.draftState.attachments, [file], "audio");
		stream.getTracks().forEach((track) => track.stop());
		this.recordingState.mediaRecorder = null;
		this.recordingState.audioChunks = [];
		this.recordingState.isRecording = false;
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
		if (
			hasComposerDraftChanges({
				tagsValue: this.draftState.tagsValue,
				tagDraft: this.draftState.tagDraft,
				content: this.draftState.content,
				attachments: this.draftState.attachments,
			})
		) {
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

	private getComposerTags(): string[] {
		return getComposerTags(this.draftState);
	}

	private commitComposerTagDraft(): boolean {
		return commitComposerTagDraft(this.draftState);
	}

	private removeComposerTag(tagToRemove: string): void {
		removeComposerTag(this.draftState, tagToRemove);
	}

	private handleTagFilterToggle(tag: string): void {
		this.filters.selectedTag = this.filters.selectedTag === tag ? "" : tag;
		this.isFilterExpanded = true;
		void this.refresh();
	}
}
