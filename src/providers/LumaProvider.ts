import { GenerationRecord, GenerationRequest, GenerationStatus } from "../types";
import { VideoProvider } from "./BaseProvider";

const LUMA_API_BASE = "https://api.lumalabs.ai/dream-machine/v1";

interface LumaGeneration {
  id: string;
  state: string;
  failure_reason?: string;
  assets?: {
    video?: string;
    image?: string;
  };
  created_at: string;
  completed_at?: string;
}

export class LumaProvider implements VideoProvider {
  name = "Luma AI";

  constructor(private apiKey: string) {}

  async startGeneration(request: GenerationRequest): Promise<string> {
    const body: Record<string, unknown> = {
      prompt: request.prompt,
      model: "ray-2",
      resolution: request.resolution,
      duration: request.duration,
      aspect_ratio: request.aspectRatio,
    };

    const response = await fetch(`${LUMA_API_BASE}/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Luma API error ${response.status}: ${err.detail || JSON.stringify(err)}`);
    }

    const data: LumaGeneration = await response.json();
    return data.id;
  }

  async pollStatus(id: string): Promise<Partial<GenerationRecord>> {
    const response = await fetch(`${LUMA_API_BASE}/generations/${id}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Poll failed: ${response.statusText}`);
    }

    const data: LumaGeneration = await response.json();

    const statusMap: Record<string, GenerationStatus> = {
      queued: "queued",
      dreaming: "dreaming",
      processing: "processing",
      completed: "completed",
      failed: "failed",
    };

    const status = statusMap[data.state] ?? "processing";

    return {
      status,
      videoUrl: data.assets?.video,
      thumbnailUrl: data.assets?.image,
      completedAt: data.completed_at ? new Date(data.completed_at).getTime() : undefined,
      error: data.failure_reason,
    };
  }
}
