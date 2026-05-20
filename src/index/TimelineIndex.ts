import type { TimelineIndexItem } from "../models/TimelineEntry";

export class TimelineIndex {
	private items = new Map<string, TimelineIndexItem>();

	getAll(): TimelineIndexItem[] {
		return Array.from(this.items.values()).sort((left, right) =>
			right.createdAt.localeCompare(left.createdAt),
		);
	}

	getById(id: string): TimelineIndexItem | null {
		return this.items.get(id) ?? null;
	}

	upsert(item: TimelineIndexItem): void {
		this.items.set(item.id, item);
	}

	remove(id: string): void {
		this.items.delete(id);
	}

	clear(): void {
		this.items.clear();
	}

	count(): number {
		return this.items.size;
	}
}
