export function getNow(): Date {
	return new Date();
}

export function formatDateForFile(date: Date): string {
	const year = date.getFullYear().toString();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");

	return `${year}-${month}-${day}`;
}

export function formatTimeForEntry(date: Date): string {
	const hours = `${date.getHours()}`.padStart(2, "0");
	const minutes = `${date.getMinutes()}`.padStart(2, "0");

	return `${hours}:${minutes}`;
}

export function toIsoString(date: Date): string {
	return date.toISOString();
}
