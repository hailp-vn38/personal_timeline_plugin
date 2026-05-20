import { TFile } from "obsidian";

export async function updateTimelineFrontmatter(
	file: TFile,
	entryCount: number,
	updatedAt: string,
): Promise<void> {
	await file.vault.process(file, (content) => {
		if (!content.startsWith("---\n")) {
			return content;
		}

		const frontmatterEnd = content.indexOf("\n---\n", 4);
		if (frontmatterEnd === -1) {
			return content;
		}

		const frontmatter = content.slice(4, frontmatterEnd);
		const body = content.slice(frontmatterEnd + 5);
		const nextFrontmatter = setFrontmatterValue(
			setFrontmatterValue(frontmatter, "entry_count", String(entryCount)),
			"updated_at",
			updatedAt,
		);

		return `---\n${nextFrontmatter}\n---\n${body}`;
	});
}

function setFrontmatterValue(frontmatter: string, key: string, value: string): string {
	const pattern = new RegExp(`^${key}:.*$`, "m");
	if (pattern.test(frontmatter)) {
		return frontmatter.replace(pattern, `${key}: ${value}`);
	}

	return `${frontmatter}\n${key}: ${value}`;
}
