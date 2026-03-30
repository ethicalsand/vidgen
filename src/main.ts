import { Plugin, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, GenerationRecord, VideoGenSettings } from "./types";
import { VidGenSettingsTab } from "./SettingsTab";
import { VideoGeneratorView, VIEW_TYPE_VIDGEN } from "./VideoGeneratorView";

interface VidGenData {
  settings: VideoGenSettings;
  history: GenerationRecord[];
}

export default class VidGenPlugin extends Plugin {
  settings: VideoGenSettings;
  private history: GenerationRecord[] = [];

  async onload(): Promise<void> {
    await this.loadData();

    // Register the view
    this.registerView(VIEW_TYPE_VIDGEN, (leaf) => {
      return new VideoGeneratorView(
        leaf,
        this.settings,
        this.history,
        async (h) => {
          this.history = h;
          await this.savePluginData();
        }
      );
    });

    // Ribbon icon
    this.addRibbonIcon("video", "Open VidGen", async () => {
      await this.activateView();
    });

    // Command
    this.addCommand({
      id: "open-vidgen",
      name: "Open Video Generator",
      callback: async () => {
        await this.activateView();
      },
    });

    // Settings tab
    this.addSettingTab(new VidGenSettingsTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_VIDGEN);
  }

  async loadData(): Promise<void> {
    const raw = await super.loadData() as VidGenData | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, raw?.settings ?? {});
    this.history = raw?.history ?? [];
  }

  async saveSettings(): Promise<void> {
    await this.savePluginData();

    // Propagate updated settings to open views
    this.app.workspace.getLeavesOfType(VIEW_TYPE_VIDGEN).forEach((leaf) => {
      const view = leaf.view;
      if (view instanceof VideoGeneratorView) {
        view.updateSettings(this.settings);
      }
    });
  }

  private async savePluginData(): Promise<void> {
    const data: VidGenData = {
      settings: this.settings,
      history: this.history,
    };
    await super.saveData(data);
  }

  private async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_VIDGEN);

    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf: WorkspaceLeaf = this.app.workspace.getRightLeaf(false)!;
    await leaf.setViewState({ type: VIEW_TYPE_VIDGEN, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
}
