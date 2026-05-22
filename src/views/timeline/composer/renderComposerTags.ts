import { setIcon } from "obsidian";

interface RenderComposerTagsOptions {
	tags: string[];
	draftValue: string;
	placeholder: string;
	onDraftChange: (value: string) => void;
	onCommitDraft: () => boolean;
	onRemoveTag: (tag: string) => void;
	onRefresh: () => void;
}

export function renderComposerTags(
	container: HTMLElement,
	options: RenderComposerTagsOptions,
): void {
	let isComposing = false;
	const tagsRow = container.createDiv({
		cls: "timeline-composer-tags-row",
	});

	if (options.tags.length > 0) {
		const tagsList = tagsRow.createDiv({
			cls: "timeline-composer-tag-list",
		});
		for (const tag of options.tags) {
			const chip = tagsList.createDiv({ cls: "timeline-tag-chip" });
			chip.createSpan({
				cls: "timeline-tag-chip-label",
				text: `#${tag}`,
			});
			const removeButton = chip.createEl("button", {
				cls: "timeline-tag-chip-remove",
				attr: { "aria-label": `Remove #${tag}` },
			});
			setIcon(removeButton, "x");
			removeButton.addEventListener("click", () => {
				options.onRemoveTag(tag);
				options.onRefresh();
			});
		}
	}

	const tagsInput = tagsRow.createEl("input", {
		type: "text",
		placeholder: options.placeholder,
	});
	tagsInput.addClass("timeline-composer-tag-input");
	tagsInput.value = options.draftValue;
	tagsInput.addEventListener("compositionstart", () => {
		isComposing = true;
	});
	tagsInput.addEventListener("compositionend", () => {
		isComposing = false;
		options.onDraftChange(tagsInput.value);
	});
	tagsInput.addEventListener("input", () => {
		options.onDraftChange(tagsInput.value);
	});
	tagsInput.addEventListener("keydown", (event) => {
		if (event.isComposing || isComposing) {
			return;
		}

		if (
			event.key === "Enter" ||
			event.key === "," ||
			event.key === " "
		) {
			event.preventDefault();
			if (options.onCommitDraft()) {
				options.onRefresh();
			}
			return;
		}

		if (event.key === "Backspace" && !tagsInput.value && options.tags.length > 0) {
			const lastTag = options.tags[options.tags.length - 1];
			if (lastTag) {
				options.onRemoveTag(lastTag);
				options.onRefresh();
			}
		}
	});
}
