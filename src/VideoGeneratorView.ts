import {
  ItemView,
  WorkspaceLeaf,
  Notice,
  setIcon,
  requestUrl,
} from "obsidian";
import {
  AspectRatio,
  GenerationRecord,
  GenerationRequest,
  GenerationStatus,
  VideoDuration,
  VideoGenSettings,
  VideoResolution,
} from "./types";
import { LumaProvider } from "./providers/LumaProvider";
import { RunwayProvider } from "./providers/RunwayProvider";
import { VideoProvider } from "./providers/BaseProvider";

export const VIEW_TYPE_VIDGEN = "vidgen-view";

const EXAMPLE_PROMPTS = [
  "A cinematic aerial shot of a misty mountain range at sunrise",
  "A cozy coffee shop in the rain, people walking by with umbrellas",
  "An astronaut floating through a colorful nebula in space",
  "A time-lapse of a blooming flower in a sunlit garden",
  "Ocean waves crashing on a rocky shore at golden hour",
  "A futuristic city skyline at night with neon lights reflecting on wet streets",
];

const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: "16:9", label: "Landscape", icon: "monitor" },
  { value: "9:16", label: "Portrait", icon: "smartphone" },
  { value: "1:1", label: "Square", icon: "square" },
];

export class VideoGeneratorView extends ItemView {
  private settings: VideoGenSettings;
  private history: GenerationRecord[] = [];
  private onSaveHistory: (history: GenerationRecord[]) => Promise<void>;

  // UI state
  private promptEl: HTMLTextAreaElement;
  private aspectRatioEl: AspectRatio;
  private durationEl: VideoDuration;
  private resolutionEl: VideoResolution;
  private generateBtn: HTMLButtonElement;
  private statusSection: HTMLElement;
  private outputSection: HTMLElement;
  private historySection: HTMLElement;
  private isGenerating = false;

  constructor(
    leaf: WorkspaceLeaf,
    settings: VideoGenSettings,
    history: GenerationRecord[],
    onSaveHistory: (history: GenerationRecord[]) => Promise<void>
  ) {
    super(leaf);
    this.settings = settings;
    this.history = history;
    this.onSaveHistory = onSaveHistory;
    this.aspectRatioEl = settings.defaultAspectRatio;
    this.durationEl = settings.defaultDuration;
    this.resolutionEl = settings.defaultResolution;
  }

  getViewType(): string {
    return VIEW_TYPE_VIDGEN;
  }

  getDisplayText(): string {
    return "VidGen";
  }

  getIcon(): string {
    return "video";
  }

  updateSettings(settings: VideoGenSettings): void {
    this.settings = settings;
  }

  async onOpen(): Promise<void> {
    this.renderUI();
  }

  async onClose(): Promise<void> {
    // nothing to clean up
  }

  private renderUI(): void {
    const root = this.contentEl;
    root.empty();
    root.addClass("vidgen-root");

    // Header
    const header = root.createDiv({ cls: "vidgen-header" });
    header.createEl("h2", { text: "VidGen", cls: "vidgen-title" });
    const subtitle = header.createEl("p", { cls: "vidgen-subtitle" });
    subtitle.setText("AI Video Generator");

    // Main content
    const content = root.createDiv({ cls: "vidgen-content" });

    // Prompt section
    this.renderPromptSection(content);

    // Options section
    this.renderOptionsSection(content);

    // Generate button
    this.renderGenerateButton(content);

    // Status section (hidden initially)
    this.statusSection = content.createDiv({ cls: "vidgen-status-section vidgen-hidden" });

    // Output section (hidden initially)
    this.outputSection = content.createDiv({ cls: "vidgen-output-section vidgen-hidden" });

    // History section
    this.historySection = content.createDiv({ cls: "vidgen-history-section" });
    this.renderHistory();
  }

  private renderPromptSection(parent: HTMLElement): void {
    const section = parent.createDiv({ cls: "vidgen-section" });

    const labelRow = section.createDiv({ cls: "vidgen-label-row" });
    labelRow.createEl("label", { text: "Prompt", cls: "vidgen-label" });

    const randomBtn = labelRow.createEl("button", {
      cls: "vidgen-random-btn",
      title: "Get a random example prompt",
    });
    setIcon(randomBtn, "shuffle");
    randomBtn.createSpan({ text: " Inspire me" });

    randomBtn.addEventListener("click", () => {
      const example = EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
      this.promptEl.value = example;
      this.promptEl.dispatchEvent(new Event("input"));
      this.promptEl.focus();
    });

    this.promptEl = section.createEl("textarea", {
      cls: "vidgen-prompt-input",
      attr: {
        placeholder:
          "Describe the video you want to create...\n\nTip: Be specific about lighting, camera movement, mood, and setting.",
        rows: "5",
      },
    }) as HTMLTextAreaElement;

    // Character count
    const charCount = section.createDiv({ cls: "vidgen-char-count" });
    charCount.setText("0 / 500");

    this.promptEl.addEventListener("input", () => {
      const len = this.promptEl.value.length;
      charCount.setText(`${len} / 500`);
      charCount.toggleClass("vidgen-char-warn", len > 400);
      charCount.toggleClass("vidgen-char-over", len > 500);
    });
  }

  private renderOptionsSection(parent: HTMLElement): void {
    const section = parent.createDiv({ cls: "vidgen-section" });
    section.createEl("p", { text: "Options", cls: "vidgen-label" });

    // Aspect ratio picker
    const arGroup = section.createDiv({ cls: "vidgen-option-group" });
    arGroup.createEl("span", { text: "Aspect Ratio", cls: "vidgen-option-label" });
    const arButtons = arGroup.createDiv({ cls: "vidgen-ratio-buttons" });

    ASPECT_RATIOS.forEach(({ value, label, icon }) => {
      const btn = arButtons.createEl("button", {
        cls: `vidgen-ratio-btn ${value === this.aspectRatioEl ? "active" : ""}`,
        title: label,
      });
      setIcon(btn, icon);
      btn.createSpan({ text: ` ${value}` });
      btn.addEventListener("click", () => {
        this.aspectRatioEl = value;
        arButtons.querySelectorAll(".vidgen-ratio-btn").forEach((b) =>
          b.removeClass("active")
        );
        btn.addClass("active");
      });
    });

    // Duration + Resolution row
    const row = section.createDiv({ cls: "vidgen-option-row" });

    // Duration
    const durGroup = row.createDiv({ cls: "vidgen-option-group" });
    durGroup.createEl("span", { text: "Duration", cls: "vidgen-option-label" });
    const durSelect = durGroup.createEl("select", { cls: "vidgen-select" }) as HTMLSelectElement;
    (["5s", "10s"] as VideoDuration[]).forEach((d) => {
      const opt = durSelect.createEl("option", { value: d, text: d });
      if (d === this.durationEl) opt.selected = true;
    });
    durSelect.addEventListener("change", () => {
      this.durationEl = durSelect.value as VideoDuration;
    });

    // Resolution
    const resGroup = row.createDiv({ cls: "vidgen-option-group" });
    resGroup.createEl("span", { text: "Resolution", cls: "vidgen-option-label" });
    const resSelect = resGroup.createEl("select", { cls: "vidgen-select" }) as HTMLSelectElement;
    (["540p", "720p", "1080p"] as VideoResolution[]).forEach((r) => {
      const opt = resSelect.createEl("option", { value: r, text: r });
      if (r === this.resolutionEl) opt.selected = true;
    });
    resSelect.addEventListener("change", () => {
      this.resolutionEl = resSelect.value as VideoResolution;
    });

    // Provider indicator
    const providerRow = section.createDiv({ cls: "vidgen-provider-row" });
    providerRow.createEl("span", { text: "Provider:", cls: "vidgen-option-label" });
    const providerBadge = providerRow.createEl("span", {
      cls: "vidgen-provider-badge",
      text: this.settings.provider === "luma" ? "Luma AI" : "Runway ML",
    });
    providerBadge.setAttribute("data-provider", this.settings.provider);
  }

  private renderGenerateButton(parent: HTMLElement): void {
    const wrapper = parent.createDiv({ cls: "vidgen-generate-wrapper" });
    this.generateBtn = wrapper.createEl("button", {
      cls: "vidgen-generate-btn",
      text: "Generate Video",
    }) as HTMLButtonElement;
    setIcon(this.generateBtn, "sparkles");

    this.generateBtn.addEventListener("click", () => {
      this.handleGenerate();
    });
  }

  private async handleGenerate(): Promise<void> {
    if (this.isGenerating) return;

    const prompt = this.promptEl.value.trim();
    if (!prompt) {
      new Notice("Please enter a prompt first.");
      this.promptEl.focus();
      return;
    }
    if (prompt.length > 500) {
      new Notice("Prompt is too long. Please keep it under 500 characters.");
      return;
    }

    const apiKey =
      this.settings.provider === "luma"
        ? this.settings.lumaApiKey
        : this.settings.runwayApiKey;

    if (!apiKey) {
      new Notice(
        `No API key set. Go to Settings > VidGen to add your ${
          this.settings.provider === "luma" ? "Luma AI" : "Runway ML"
        } API key.`
      );
      return;
    }

    const request: GenerationRequest = {
      prompt,
      aspectRatio: this.aspectRatioEl,
      duration: this.durationEl,
      resolution: this.resolutionEl,
      provider: this.settings.provider,
    };

    await this.startGeneration(request);
  }

  private async startGeneration(request: GenerationRequest): Promise<void> {
    this.isGenerating = true;
    this.generateBtn.disabled = true;
    this.generateBtn.setText("Generating...");

    // Show status
    this.statusSection.removeClass("vidgen-hidden");
    this.outputSection.addClass("vidgen-hidden");
    this.renderStatus("queued", "Sending request...");

    const record: GenerationRecord = {
      id: `gen-${Date.now()}`,
      internalId: "",
      prompt: request.prompt,
      provider: request.provider,
      aspectRatio: request.aspectRatio,
      duration: request.duration,
      status: "queued",
      createdAt: Date.now(),
    };

    try {
      const provider = this.getProvider();
      const internalId = await provider.startGeneration(request);
      record.internalId = internalId;

      this.renderStatus("processing", "Video is being generated...");
      await this.pollUntilDone(provider, record);
    } catch (err) {
      record.status = "failed";
      record.error = String(err);
      this.renderStatus("failed", `Generation failed: ${record.error}`);
      new Notice(`VidGen: ${record.error}`);
    } finally {
      this.isGenerating = false;
      this.generateBtn.disabled = false;
      this.generateBtn.setText("Generate Video");
      this.addToHistory(record);
    }
  }

  private async pollUntilDone(
    provider: VideoProvider,
    record: GenerationRecord
  ): Promise<void> {
    const maxAttempts = 120; // 10 minutes max
    let attempts = 0;
    const pollInterval = 5000; // 5 seconds

    while (attempts < maxAttempts) {
      await sleep(pollInterval);
      attempts++;

      try {
        const update = await provider.pollStatus(record.internalId);
        Object.assign(record, update);

        const statusMessages: Record<GenerationStatus, string> = {
          queued: "Queued, waiting to start...",
          dreaming: "Dreaming up your video...",
          processing: `Processing... (${attempts * 5}s elapsed)`,
          completed: "Done!",
          failed: `Failed: ${record.error || "Unknown error"}`,
        };

        this.renderStatus(record.status, statusMessages[record.status] ?? "Processing...");

        if (record.status === "completed") {
          this.renderOutput(record);
          return;
        }

        if (record.status === "failed") {
          throw new Error(record.error || "Generation failed");
        }
      } catch (err) {
        if (attempts >= maxAttempts) throw err;
        // transient errors — keep polling
      }
    }

    throw new Error("Generation timed out after 10 minutes.");
  }

  private renderStatus(status: GenerationStatus, message: string): void {
    this.statusSection.empty();

    const statusEl = this.statusSection.createDiv({ cls: "vidgen-status" });
    statusEl.setAttribute("data-status", status);

    const iconMap: Record<GenerationStatus, string> = {
      queued: "clock",
      dreaming: "sparkles",
      processing: "loader",
      completed: "check-circle",
      failed: "alert-circle",
    };
    const iconEl = statusEl.createDiv({ cls: "vidgen-status-icon" });
    setIcon(iconEl, iconMap[status] ?? "loader");

    statusEl.createEl("span", { text: message, cls: "vidgen-status-text" });

    if (["queued", "dreaming", "processing"].includes(status)) {
      const progress = this.statusSection.createDiv({ cls: "vidgen-progress-bar" });
      progress.createDiv({ cls: "vidgen-progress-fill" });
    }
  }

  private renderOutput(record: GenerationRecord): void {
    this.outputSection.empty();
    this.outputSection.removeClass("vidgen-hidden");

    const outputCard = this.outputSection.createDiv({ cls: "vidgen-output-card" });

    if (record.videoUrl) {
      const videoWrapper = outputCard.createDiv({ cls: "vidgen-video-wrapper" });
      const video = videoWrapper.createEl("video", {
        cls: "vidgen-video",
        attr: {
          controls: "true",
          autoplay: "true",
          loop: "true",
          playsinline: "true",
        },
      });
      const source = video.createEl("source", {
        attr: { src: record.videoUrl, type: "video/mp4" },
      });
      video.appendChild(source);
    } else {
      outputCard.createEl("p", {
        text: "Video generated but URL not available.",
        cls: "vidgen-no-video",
      });
    }

    const outputMeta = outputCard.createDiv({ cls: "vidgen-output-meta" });
    outputMeta.createEl("p", { text: record.prompt, cls: "vidgen-output-prompt" });

    const outputActions = outputCard.createDiv({ cls: "vidgen-output-actions" });

    if (record.videoUrl) {
      const downloadBtn = outputActions.createEl("a", {
        cls: "vidgen-action-btn vidgen-download-btn",
        attr: { href: record.videoUrl, download: `vidgen-${record.id}.mp4`, target: "_blank" },
      });
      setIcon(downloadBtn, "download");
      downloadBtn.createSpan({ text: " Download" });

      const copyBtn = outputActions.createEl("button", {
        cls: "vidgen-action-btn",
      });
      setIcon(copyBtn, "copy");
      copyBtn.createSpan({ text: " Copy URL" });
      copyBtn.addEventListener("click", async () => {
        await navigator.clipboard.writeText(record.videoUrl!);
        new Notice("Video URL copied to clipboard!");
      });
    }
  }

  private renderHistory(): void {
    this.historySection.empty();

    if (this.history.length === 0) return;

    const histHeader = this.historySection.createDiv({ cls: "vidgen-history-header" });
    histHeader.createEl("h3", { text: "Recent Generations", cls: "vidgen-history-title" });
    const clearBtn = histHeader.createEl("button", {
      cls: "vidgen-clear-btn",
      title: "Clear history",
    });
    setIcon(clearBtn, "trash-2");
    clearBtn.addEventListener("click", async () => {
      this.history = [];
      await this.onSaveHistory(this.history);
      this.renderHistory();
    });

    const list = this.historySection.createDiv({ cls: "vidgen-history-list" });

    [...this.history].reverse().forEach((record) => {
      const item = list.createDiv({ cls: "vidgen-history-item" });
      item.setAttribute("data-status", record.status);

      const itemIcon = item.createDiv({ cls: "vidgen-history-icon" });
      if (record.status === "completed") {
        setIcon(itemIcon, "check-circle");
      } else if (record.status === "failed") {
        setIcon(itemIcon, "alert-circle");
      } else {
        setIcon(itemIcon, "loader");
      }

      const itemContent = item.createDiv({ cls: "vidgen-history-content" });
      itemContent.createEl("p", {
        text: record.prompt.length > 60 ? record.prompt.slice(0, 60) + "..." : record.prompt,
        cls: "vidgen-history-prompt",
      });

      const itemMeta = itemContent.createEl("span", { cls: "vidgen-history-meta" });
      const elapsed = record.completedAt
        ? `${Math.round((record.completedAt - record.createdAt) / 1000)}s`
        : "";
      itemMeta.setText(
        `${record.provider === "luma" ? "Luma AI" : "Runway"} · ${record.aspectRatio} · ${record.duration}${elapsed ? " · " + elapsed : ""}`
      );

      const timestamp = new Date(record.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      itemContent.createEl("span", { text: timestamp, cls: "vidgen-history-time" });

      if (record.status === "completed" && record.videoUrl) {
        const playBtn = item.createEl("button", {
          cls: "vidgen-history-play",
          title: "View this video",
        });
        setIcon(playBtn, "play-circle");
        playBtn.addEventListener("click", () => {
          this.outputSection.empty();
          this.outputSection.removeClass("vidgen-hidden");
          this.renderOutput(record);
          this.outputSection.scrollIntoView({ behavior: "smooth" });
        });
      }
    });
  }

  private addToHistory(record: GenerationRecord): void {
    this.history.push(record);
    if (this.history.length > this.settings.historyLimit) {
      this.history.shift();
    }
    this.onSaveHistory(this.history);
    this.renderHistory();
  }

  private getProvider(): VideoProvider {
    if (this.settings.provider === "luma") {
      return new LumaProvider(this.settings.lumaApiKey);
    }
    return new RunwayProvider(this.settings.runwayApiKey);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
