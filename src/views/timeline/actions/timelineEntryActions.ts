import { Notice, TFile } from "obsidian";

import type PersonalTimelinePlugin from "../../../main";
import type { TimelineIndexItem } from "../../../models/TimelineEntry";
import { confirmAction } from "../modals/ConfirmTimelineActionModal";
import { EditTimelineEntryModal } from "../modals/EditTimelineEntryModal";
import { getErrorMessage } from "../utils/timelineErrors";

interface CreateTimelineEntryActionsOptions {
	plugin: PersonalTimelinePlugin;
}

export interface TimelineEntryActions {
	edit: (item: TimelineIndexItem) => Promise<void>;
	duplicate: (item: TimelineIndexItem) => Promise<void>;
	openSource: (item: TimelineIndexItem) => Promise<void>;
	delete: (item: TimelineIndexItem) => Promise<void>;
}

export function createTimelineEntryActions(
	options: CreateTimelineEntryActionsOptions,
): TimelineEntryActions {
	const { plugin } = options;

	return {
		edit: async (item) => {
			const entry = await plugin.timelineRepository.getEntryById(
				item.sourcePath,
				item.id,
			);
			if (!entry) {
				new Notice("Timeline entry is unavailable.");
				return;
			}

			new EditTimelineEntryModal(plugin, item.sourcePath, entry).open();
		},
		duplicate: async (item) => {
			try {
				await plugin.timelineRepository.duplicateEntry(
					item.sourcePath,
					item.id,
				);
				await plugin.timelineIndex.rebuild();
				await plugin.refreshTimelineViews();
				new Notice("Entry duplicated.");
			} catch (error) {
				new Notice(getErrorMessage(error, "Unable to duplicate entry."));
			}
		},
		openSource: async (item) => {
			const file = plugin.app.vault.getAbstractFileByPath(item.sourcePath);
			if (file instanceof TFile) {
				await plugin.openTimelineSource(file, item.id);
				return;
			}

			new Notice("Source file is unavailable.");
		},
		delete: async (item) => {
			const confirmed = await confirmAction(
				plugin,
				"Delete timeline entry",
				"Delete this timeline entry? Attachments will not be removed automatically.",
				"Delete",
			);
			if (!confirmed) {
				return;
			}

			try {
				await plugin.timelineRepository.deleteEntry(
					item.sourcePath,
					item.id,
				);
				await plugin.timelineIndex.rebuild();
				await plugin.refreshTimelineViews();
				new Notice("Entry deleted.");
			} catch (error) {
				new Notice(getErrorMessage(error, "Unable to delete entry."));
			}
		},
	};
}
