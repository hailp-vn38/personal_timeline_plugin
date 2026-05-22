import type { TimelineFilterState } from "../../../index/filterTimeline";

export function currentTimeForComposer(): string {
	const now = new Date();
	return `${`${now.getHours()}`.padStart(2, "0")}:${`${now.getMinutes()}`.padStart(2, "0")}`;
}

export function shiftDate(dateText: string, days: number): string {
	const date = new Date(`${dateText}T00:00:00`);
	date.setDate(date.getDate() + days);
	return [
		date.getFullYear(),
		`${date.getMonth() + 1}`.padStart(2, "0"),
		`${date.getDate()}`.padStart(2, "0"),
	].join("-");
}

export function describeDatePreset(
	filters: TimelineFilterState,
	activeDate: string,
): string {
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

export function formatDisplayDate(date: string): string {
	const [year, month, day] = date.split("-");
	return `${Number(day)}/${Number(month)}/${year}`;
}

export function formatDayHeader(date: string, today: string): string {
	if (date === today) {
		return "Today";
	}

	return formatDisplayDate(date);
}
