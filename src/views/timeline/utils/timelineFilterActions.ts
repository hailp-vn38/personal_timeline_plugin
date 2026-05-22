import type {
	TimelineDatePreset,
	TimelineFilterState,
} from "../../../index/filterTimeline";

export function resetExpandedFilters(
	filters: TimelineFilterState,
	today: string,
): void {
	filters.datePreset = "today";
	filters.customDate = today;
	filters.selectedTag = "";
	filters.startTime = "";
	filters.endTime = "";
}

export function updateDatePreset(
	filters: TimelineFilterState,
	preset: TimelineDatePreset,
	today: string,
): void {
	filters.datePreset = preset;
	if (preset === "today") {
		filters.customDate = today;
	}
}
