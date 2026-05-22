import type {
	TimelineDatePreset,
	TimelineFilterState,
} from "../../../index/filterTimeline";

interface RenderTimelineToolbarOptions {
	filters: TimelineFilterState;
	today: string;
	summaryText: string;
	isSearchExpanded: boolean;
	isFilterExpanded: boolean;
	availableTags: string[];
	onSearchToggle: () => void;
	onFilterToggle: () => void;
	onSearchInput: (value: string) => void;
	onDatePresetChange: (preset: TimelineDatePreset) => void;
	onTagChange: (tag: string) => void;
	onCustomDateChange: (value: string) => void;
	onStartTimeChange: (value: string) => void;
	onEndTimeChange: (value: string) => void;
}

export function renderTimelineToolbar(
	container: HTMLElement,
	options: RenderTimelineToolbarOptions,
): void {
	const toolbar = container.createDiv({ cls: "timeline-toolbar" });
	const summaryRow = toolbar.createDiv({ cls: "timeline-toolbar-row" });
	summaryRow.createDiv({
		cls: "timeline-toolbar-summary",
		text: options.summaryText,
	});

	const controls = summaryRow.createDiv({
		cls: "timeline-toolbar-controls",
	});
	const searchToggleButton = controls.createEl("button", {
		text: options.isSearchExpanded ? "Close search" : "Search",
		cls: "timeline-filter-toggle",
	});
	searchToggleButton.addEventListener("click", options.onSearchToggle);

	const filtersToggleButton = controls.createEl("button", {
		text: options.isFilterExpanded ? "Close filter" : "Filter",
		cls: "timeline-filter-toggle",
	});
	filtersToggleButton.addEventListener("click", options.onFilterToggle);

	if (options.isSearchExpanded) {
		const searchInput = toolbar.createEl("input", {
			type: "search",
			placeholder: "Search text, content, tags...",
		});
		searchInput.addClass("timeline-input");
		searchInput.value = options.filters.searchTerm;
		searchInput.addEventListener("input", () => {
			options.onSearchInput(searchInput.value);
		});
	}

	if (!options.isFilterExpanded) {
		return;
	}

	const filtersRow = toolbar.createDiv({ cls: "timeline-filter-row" });

	const datePresetSelect = filtersRow.createEl("select");
	datePresetSelect.addClass("timeline-select");
	addOption(datePresetSelect, "today", "Today");
	addOption(datePresetSelect, "yesterday", "Yesterday");
	addOption(datePresetSelect, "this-week", "This week");
	addOption(datePresetSelect, "custom", "Custom day");
	datePresetSelect.value = options.filters.datePreset;
	datePresetSelect.addEventListener("change", () => {
		options.onDatePresetChange(
			datePresetSelect.value as TimelineDatePreset,
		);
	});

	const tagSelect = filtersRow.createEl("select");
	tagSelect.addClass("timeline-select");
	addOption(tagSelect, "", "All tags");
	for (const tag of options.availableTags) {
		addOption(tagSelect, tag, `#${tag}`);
	}
	tagSelect.value = options.filters.selectedTag;
	tagSelect.addEventListener("change", () => {
		options.onTagChange(tagSelect.value);
	});

	const advancedFilters = toolbar.createDiv({
		cls: "timeline-filter-advanced",
	});
	if (options.filters.datePreset === "custom") {
		const customDateInput = advancedFilters.createEl("input", {
			type: "date",
		});
		customDateInput.addClass("timeline-input");
		customDateInput.value = options.filters.customDate;
		customDateInput.addEventListener("change", () => {
			options.onCustomDateChange(customDateInput.value || options.today);
		});
	}

	const timeRow = advancedFilters.createDiv({
		cls: "timeline-filter-time-row",
	});
	const startTimeInput = timeRow.createEl("input", { type: "time" });
	startTimeInput.addClass("timeline-input");
	startTimeInput.value = options.filters.startTime;
	startTimeInput.addEventListener("change", () => {
		options.onStartTimeChange(startTimeInput.value);
	});

	const endTimeInput = timeRow.createEl("input", { type: "time" });
	endTimeInput.addClass("timeline-input");
	endTimeInput.value = options.filters.endTime;
	endTimeInput.addEventListener("change", () => {
		options.onEndTimeChange(endTimeInput.value);
	});
}

function addOption(
	select: HTMLSelectElement,
	value: string,
	label: string,
): void {
	select.createEl("option", { value, text: label });
}
