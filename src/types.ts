export type VideoProvider = "luma" | "runway";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4";

export type VideoDuration = "5s" | "10s";

export type VideoResolution = "540p" | "720p" | "1080p";

export interface VideoGenSettings {
  provider: VideoProvider;
  lumaApiKey: string;
  runwayApiKey: string;
  defaultAspectRatio: AspectRatio;
  defaultDuration: VideoDuration;
  defaultResolution: VideoResolution;
  saveVideosTo: string;
  historyLimit: number;
}

export interface GenerationRequest {
  prompt: string;
  aspectRatio: AspectRatio;
  duration: VideoDuration;
  resolution: VideoResolution;
  provider: VideoProvider;
}

export type GenerationStatus =
  | "queued"
  | "dreaming"
  | "processing"
  | "completed"
  | "failed";

export interface GenerationRecord {
  id: string;
  internalId: string;
  prompt: string;
  provider: VideoProvider;
  aspectRatio: AspectRatio;
  duration: VideoDuration;
  status: GenerationStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export const DEFAULT_SETTINGS: VideoGenSettings = {
  provider: "luma",
  lumaApiKey: "",
  runwayApiKey: "",
  defaultAspectRatio: "16:9",
  defaultDuration: "5s",
  defaultResolution: "720p",
  saveVideosTo: "VidGen",
  historyLimit: 20,
};
