import { MarkdownView, Notice, Plugin, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";

import { TimelineIndexService } from "./index/TimelineIndexService";
import type { TimelinePluginSettings } from "./models/TimelineSettings";
import { QuickCheckInModal } from "./quick-check-in/QuickCheckInModal";
import { renderTimelineMetadataInReadingView } from "./reading/renderTimelineMetadata";
import { DEFAULT_SETTINGS, TimelineSettingTab } from "./settings";
import type { PendingAttachmentInput } from "./storage/attachments";
import { TimelineRepository } from "./storage/timelineRepository";
import { TimelineView, VIEW_TYPE_TIMELINE } from "./views/TimelineView";

interface CreateQuickCheckInInput {
	content: string;
	tags: string[];
	attachments: PendingAttachmentInput[];
	source: "quick-capture" | "manual" | "imported";
}

export default class PersonalTimelinePlugin extends Plugin {
	settings!: TimelinePluginSettings;
	timelineRepository!: TimelineRepository;
	timelineIndex!: TimelineIndexService;

	async onload(): Promise<void> {
		await this.loadSettings();
		await this.initializeServices();
		this.registerView(
			VIEW_TYPE_TIMELINE,
			(leaf) => new TimelineView(leaf, this),
		);
		this.registerMarkdownPostProcessor((el, ctx) => {
			void renderTimelineMetadataInReadingView(this, el, ctx);
		});
		this.registerVaultEvents();

		this.addRibbonIcon("list-todo", "Open personal timeline", () => {
			void this.activateTimelineView();
		});
		this.addCommand({
			id: "open-timeline",
			name: "Open personal timeline",
			callback: () => {
				void this.activateTimelineView();
			},
		});
		this.addCommand({
			id: "create-quick-check-in",
			name: "Create quick check-in",
			callback: () => {
				this.openQuickCheckInModal();
			},
		});
		this.addCommand({
			id: "create-quick-check-in-from-selection",
			name: "Create quick check-in from selection",
			editorCallback: (editor) => {
				new QuickCheckInModal(this, { initialContent: editor.getSelection() }).open();
			},
		});

		this.addSettingTab(new TimelineSettingTab(this.app, this));
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) as Partial<TimelinePluginSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		await this.initializeServices();
		await this.refreshTimelineViews();
	}

	async activateTimelineView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_TIMELINE)[0];

		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (!rightLeaf) {
				new Notice("Unable to open the personal timeline view.");
				return;
			}

			leaf = rightLeaf;
			await leaf.setViewState({ type: VIEW_TYPE_TIMELINE, active: true });
		}

		void workspace.revealLeaf(leaf);
		await this.refreshLeafView(leaf);
	}

	async refreshTimelineViews(): Promise<void> {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_TIMELINE)) {
			await this.refreshLeafView(leaf);
		}
	}

	async openTimelineSource(file: TFile, entryId?: string): Promise<void> {
		if (entryId) {
			const linkText = this.app.metadataCache.fileToLinktext(file, "", false);
			await this.app.workspace.openLinkText(`${linkText}#^${entryId}`, "", true);
			return;
		}

		await this.app.workspace.getLeaf(true).openFile(file);
	}

	async createQuickCheckIn(input: CreateQuickCheckInInput): Promise<void> {
		await this.timelineRepository.createTextEntry(
			{
				content: input.content,
				tags: input.tags,
				type: "checkin",
				source: input.source,
				attachments: [],
			},
			new Date(),
			input.attachments,
		);
		await this.timelineIndex.rebuild();
		await this.refreshTimelineViews();
	}

	private async refreshLeafView(leaf: WorkspaceLeaf): Promise<void> {
		const view = leaf.view;
		if (view instanceof TimelineView) {
			await view.refresh();
		}
	}

	private async initializeServices(): Promise<void> {
		this.timelineRepository = new TimelineRepository(this.app, this.settings);
		this.timelineIndex = new TimelineIndexService(this.app, this.settings);
		await this.timelineIndex.rebuild();
	}

	private registerVaultEvents(): void {
		this.registerEvent(this.app.vault.on("create", (file) => {
			void this.handleVaultUpdate(file);
		}));
		this.registerEvent(this.app.vault.on("modify", (file) => {
			void this.handleVaultUpdate(file);
		}));
		this.registerEvent(this.app.vault.on("delete", (file) => {
			void this.handleVaultDelete(file);
		}));
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
			this.timelineIndex.removeBySourcePath(oldPath);
			void this.handleVaultUpdate(file);
		}));
	}

	private async handleVaultUpdate(file: TAbstractFile): Promise<void> {
		if (!(file instanceof TFile)) {
			return;
		}

		await this.timelineIndex.refreshFile(file);
		await this.refreshTimelineViews();
	}

	private async handleVaultDelete(file: TAbstractFile): Promise<void> {
		this.timelineIndex.removeBySourcePath(file.path);
		await this.timelineIndex.rebuild();
		await this.refreshTimelineViews();
	}

	private openQuickCheckInModal(): void {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const selectedText = markdownView?.editor?.getSelection() ?? "";
		new QuickCheckInModal(this, { initialContent: selectedText }).open();
	}
}
