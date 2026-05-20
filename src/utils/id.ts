function randomSuffix(length = 4): string {
	return Math.random().toString(16).slice(2, 2 + length).padEnd(length, "0");
}

function formatDateParts(date: Date): string {
	const year = date.getFullYear().toString();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	const hours = `${date.getHours()}`.padStart(2, "0");
	const minutes = `${date.getMinutes()}`.padStart(2, "0");
	const seconds = `${date.getSeconds()}`.padStart(2, "0");

	return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

export function createTimelineEntryId(date: Date): string {
	return `tl-${formatDateParts(date)}-${randomSuffix()}`;
}

export function createAttachmentId(date: Date, index: number): string {
	return `att-${formatDateParts(date)}-${index}`;
}
