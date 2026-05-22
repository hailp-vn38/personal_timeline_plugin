import { parseTags } from "../../../utils/tags";

import type {
	ComposerDraftState,
	ComposerTagDraftState,
} from "./composerTypes";

export function normalizeComposerContent(content: string): string {
	return content.trim().length === 0 ? "" : content;
}

export function getComposerTags(state: ComposerTagDraftState): string[] {
	return parseTags([state.tagsValue, state.tagDraft].filter(Boolean).join(" "));
}

export function commitComposerTagDraft(
	state: ComposerTagDraftState,
): boolean {
	const parsedDraft = parseTags(state.tagDraft);
	if (parsedDraft.length === 0) {
		state.tagDraft = "";
		return false;
	}

	state.tagsValue = parseTags(
		[state.tagsValue, parsedDraft.join(" ")]
			.filter(Boolean)
			.join(" "),
	).join(", ");
	state.tagDraft = "";
	return true;
}

export function removeComposerTag(
	state: ComposerTagDraftState,
	tagToRemove: string,
): void {
	state.tagsValue = getComposerTags(state)
		.filter((tag) => tag !== tagToRemove)
		.join(", ");
}

export function hasComposerDraftChanges(state: ComposerDraftState): boolean {
	return Boolean(
		state.tagsValue.trim() ||
			state.tagDraft.trim() ||
			state.content.trim() ||
			state.attachments.length > 0,
	);
}

export function clearComposerDraft(state: ComposerDraftState): void {
	state.content = "";
	state.tagsValue = "";
	state.tagDraft = "";
	state.attachments = [];
}

export function syncComposerTextareaHeight(
	input: HTMLTextAreaElement,
): void {
	input.style.height = "0px";
	input.style.height = `${input.scrollHeight}px`;
}
