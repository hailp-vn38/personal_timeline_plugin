import { App, normalizePath } from "obsidian";

export async function ensureNestedFolder(app: App, folderPath: string): Promise<void> {
	const normalized = normalizePath(folderPath).trim();
	if (!normalized) {
		return;
	}

	const parts = normalized.split("/").filter(Boolean);
	let current = "";

	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		if (!app.vault.getAbstractFileByPath(current)) {
			await app.vault.createFolder(current);
		}
	}
}
