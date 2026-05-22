import { Menu } from "obsidian";

import type { TimelineIndexItem } from "../../../models/TimelineEntry";
import type { TimelineEntryActions } from "./timelineEntryActions";

export function openTimelineEntryMenu(
	event: MouseEvent,
	item: TimelineIndexItem,
	actions: TimelineEntryActions,
): void {
	const menu = new Menu();
	menu.addItem((menuItem) =>
		menuItem
			.setTitle("Edit")
			.setIcon("pencil")
			.onClick(() => {
				void actions.edit(item);
			}),
	);
	menu.addItem((menuItem) =>
		menuItem
			.setTitle("Duplicate")
			.setIcon("copy")
			.onClick(() => {
				void actions.duplicate(item);
			}),
	);
	menu.addItem((menuItem) =>
		menuItem
			.setTitle("Open source")
			.setIcon("external-link")
			.onClick(() => {
				void actions.openSource(item);
			}),
	);
	menu.addSeparator();
	menu.addItem((menuItem) =>
		menuItem
			.setTitle("Delete")
			.setIcon("trash")
			.onClick(() => {
				void actions.delete(item);
			}),
	);
	menu.showAtMouseEvent(event);
}
