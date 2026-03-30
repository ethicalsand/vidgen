import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type VidGenPlugin from "./main";
import { VideoGenSettings } from "./types";

export class VidGenSettingsTab extends PluginSettingTab {
  plugin: VidGenPlugin;

  constructor(app: App, plugin: VidGenPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("vidgen-settings");

    containerEl.createEl("h2", { text: "VidGen Settings" });
    containerEl.createEl("p", {
      text: "Configure your AI video generation provider and defaults.",
      cls: "vidgen-settings-desc",
    });

    // ── Provider ──────────────────────────────────────────────
    containerEl.createEl("h3", { text: "Provider" });

    new Setting(containerEl)
      .setName("Video Provider")
      .setDesc("Choose which AI service to use for video generation.")
      .addDropdown((drop) =>
        drop
          .addOption("luma", "Luma AI (Ray-2)")
          .addOption("runway", "Runway ML (Gen-4 Turbo)")
          .setValue(this.plugin.settings.provider)
          .onChange(async (value: string) => {
            this.plugin.settings.provider = value as VideoGenSettings["provider"];
            await this.plugin.saveSettings();
          })
      );

    // ── API Keys ──────────────────────────────────────────────
    containerEl.createEl("h3", { text: "API Keys" });

    new Setting(containerEl)
      .setName("Luma AI API Key")
      .setDesc(
        createFragment((frag) => {
          frag.appendText("Your Luma AI API key. Get one at ");
          frag.createEl("a", {
            text: "lumalabs.ai",
            attr: { href: "https://lumalabs.ai/dream-machine/api/keys", target: "_blank" },
          });
          frag.appendText(".");
        })
      )
      .addText((text) =>
        text
          .setPlaceholder("luma-...")
          .setValue(this.plugin.settings.lumaApiKey)
          .onChange(async (value) => {
            this.plugin.settings.lumaApiKey = value.trim();
            await this.plugin.saveSettings();
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText("Test")
          .setCta()
          .onClick(async () => {
            await this.testLumaKey();
          })
      );

    new Setting(containerEl)
      .setName("Runway ML API Key")
      .setDesc(
        createFragment((frag) => {
          frag.appendText("Your Runway ML API key. Get one at ");
          frag.createEl("a", {
            text: "runwayml.com",
            attr: { href: "https://app.runwayml.com/settings/api-keys", target: "_blank" },
          });
          frag.appendText(".");
        })
      )
      .addText((text) =>
        text
          .setPlaceholder("key_...")
          .setValue(this.plugin.settings.runwayApiKey)
          .onChange(async (value) => {
            this.plugin.settings.runwayApiKey = value.trim();
            await this.plugin.saveSettings();
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText("Test")
          .setCta()
          .onClick(async () => {
            await this.testRunwayKey();
          })
      );

    // ── Defaults ──────────────────────────────────────────────
    containerEl.createEl("h3", { text: "Defaults" });

    new Setting(containerEl)
      .setName("Default Aspect Ratio")
      .setDesc("The aspect ratio used when opening the generator.")
      .addDropdown((drop) =>
        drop
          .addOption("16:9", "16:9 – Landscape")
          .addOption("9:16", "9:16 – Portrait")
          .addOption("1:1", "1:1 – Square")
          .addOption("4:3", "4:3 – Classic")
          .addOption("3:4", "3:4 – Tall Classic")
          .setValue(this.plugin.settings.defaultAspectRatio)
          .onChange(async (value: string) => {
            this.plugin.settings.defaultAspectRatio =
              value as VideoGenSettings["defaultAspectRatio"];
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default Duration")
      .setDesc("Default video length.")
      .addDropdown((drop) =>
        drop
          .addOption("5s", "5 seconds")
          .addOption("10s", "10 seconds")
          .setValue(this.plugin.settings.defaultDuration)
          .onChange(async (value: string) => {
            this.plugin.settings.defaultDuration = value as VideoGenSettings["defaultDuration"];
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default Resolution")
      .setDesc("Default output resolution.")
      .addDropdown((drop) =>
        drop
          .addOption("540p", "540p – Fast")
          .addOption("720p", "720p – Balanced")
          .addOption("1080p", "1080p – High Quality")
          .setValue(this.plugin.settings.defaultResolution)
          .onChange(async (value: string) => {
            this.plugin.settings.defaultResolution =
              value as VideoGenSettings["defaultResolution"];
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("History Limit")
      .setDesc("Maximum number of generations to keep in history.")
      .addSlider((slider) =>
        slider
          .setLimits(5, 50, 5)
          .setValue(this.plugin.settings.historyLimit)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.historyLimit = value;
            await this.plugin.saveSettings();
          })
      );

    // ── About ──────────────────────────────────────────────
    containerEl.createEl("h3", { text: "About" });

    const about = containerEl.createDiv({ cls: "vidgen-about" });
    about.createEl("p", {
      text: "VidGen uses Luma AI or Runway ML to generate short videos from text descriptions. Videos are generated in the cloud and streamed back to Obsidian.",
    });
  }

  private async testLumaKey(): Promise<void> {
    const key = this.plugin.settings.lumaApiKey;
    if (!key) {
      new Notice("Please enter a Luma AI API key first.");
      return;
    }
    new Notice("Testing Luma AI key...");
    try {
      const resp = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations?limit=1", {
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      });
      if (resp.ok) {
        new Notice("Luma AI key is valid!");
      } else {
        new Notice(`Luma AI key test failed: ${resp.status} ${resp.statusText}`);
      }
    } catch (e) {
      new Notice(`Luma AI key test error: ${e}`);
    }
  }

  private async testRunwayKey(): Promise<void> {
    const key = this.plugin.settings.runwayApiKey;
    if (!key) {
      new Notice("Please enter a Runway ML API key first.");
      return;
    }
    new Notice("Testing Runway ML key...");
    try {
      const resp = await fetch("https://api.runwayml.com/v1/tasks?limit=1", {
        headers: {
          Authorization: `Bearer ${key}`,
          "X-Runway-Version": "2024-11-06",
        },
      });
      if (resp.ok) {
        new Notice("Runway ML key is valid!");
      } else {
        new Notice(`Runway ML key test failed: ${resp.status} ${resp.statusText}`);
      }
    } catch (e) {
      new Notice(`Runway ML key test error: ${e}`);
    }
  }
}
