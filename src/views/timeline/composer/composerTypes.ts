import type { PendingQuickAttachment } from "./pendingAttachments";

export type ComposerFileTypeHint = "image" | "file";

export interface ComposerTagDraftState {
	tagsValue: string;
	tagDraft: string;
}

export interface ComposerDraftState extends ComposerTagDraftState {
	content: string;
	attachments: PendingQuickAttachment[];
}

export interface ComposerRecordingState {
	mediaRecorder: MediaRecorder | null;
	audioChunks: Blob[];
	isRecording: boolean;
}
