import { getAudioExtension } from "./pendingAttachments";
import type { ComposerRecordingState } from "./composerTypes";

interface StartComposerRecordingOptions {
	state: ComposerRecordingState;
	onUnsupported: () => void;
	onError: () => void;
	onReady: (file: File, stream: MediaStream) => void | Promise<void>;
	onStateChanged?: () => void | Promise<void>;
}

export async function startComposerRecording(
	options: StartComposerRecordingOptions,
): Promise<void> {
	const { state, onError, onReady, onStateChanged, onUnsupported } = options;

	if (
		!navigator.mediaDevices?.getUserMedia ||
		typeof MediaRecorder === "undefined"
	) {
		onUnsupported();
		return;
	}

	try {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: true,
		});
		state.audioChunks = [];
		state.mediaRecorder = new MediaRecorder(stream);
		state.isRecording = true;
		state.mediaRecorder.addEventListener("dataavailable", (event) => {
			if (event.data.size > 0) {
				state.audioChunks.push(event.data);
			}
		});
		state.mediaRecorder.addEventListener("stop", () => {
			const blob = new Blob(state.audioChunks, {
				type: state.mediaRecorder?.mimeType || "audio/webm",
			});
			const extension = getAudioExtension(blob.type);
			const file = new File([blob], `recording-${Date.now()}${extension}`, {
				type: blob.type,
			});
			void onReady(file, stream);
		});
		state.mediaRecorder.start();
		await onStateChanged?.();
	} catch {
		state.isRecording = false;
		onError();
	}
}

export function stopComposerRecording(state: ComposerRecordingState): void {
	if (!state.mediaRecorder || state.mediaRecorder.state === "inactive") {
		return;
	}

	state.mediaRecorder.stop();
}

export function stopComposerRecordingTracks(
	state: ComposerRecordingState,
): void {
	if (!state.mediaRecorder) {
		return;
	}

	if (state.mediaRecorder.state !== "inactive") {
		state.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
	}
	state.mediaRecorder = null;
	state.audioChunks = [];
	state.isRecording = false;
}
