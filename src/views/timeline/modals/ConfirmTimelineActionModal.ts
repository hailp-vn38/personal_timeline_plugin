import { Modal } from "obsidian";

import type PersonalTimelinePlugin from "../../../main";

export function confirmAction(
	plugin: PersonalTimelinePlugin,
	title: string,
	message: string,
	confirmLabel: string,
): Promise<boolean> {
	return new Promise((resolve) => {
		new ConfirmTimelineActionModal(
			plugin,
			title,
			message,
			confirmLabel,
			resolve,
		).open();
	});
}

class ConfirmTimelineActionModal extends Modal {
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
