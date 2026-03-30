import { GenerationRecord, GenerationRequest, GenerationStatus } from "../types";
import { VideoProvider } from "./BaseProvider";

const RUNWAY_API_BASE = "https://api.runwayml.com/v1";

interface RunwayTask {
  id: string;
  status: string;
  failure?: string;
  failureCode?: string;
  output?: string[];
  createdAt?: number;
  asOf?: number;
}

export class RunwayProvider implements VideoProvider {
  name = "Runway ML";

  constructor(private apiKey: string) {}

  async startGeneration(request: GenerationRequest): Promise<string> {
    const durationSec = parseInt(request.duration.replace("s", ""), 10);

    const body = {
      model: "gen4_turbo",
      promptText: request.prompt,
      ratio: request.aspectRatio,
      duration: durationSec,
    };

    const response = await fetch(`${RUNWAY_API_BASE}/text_to_video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Runway API error ${response.status}: ${err.error || JSON.stringify(err)}`);
    }

    const data: RunwayTask = await response.json();
    return data.id;
  }

  async pollStatus(id: string): Promise<Partial<GenerationRecord>> {
    const response = await fetch(`${RUNWAY_API_BASE}/tasks/${id}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
    });

    if (!response.ok) {
      throw new Error(`Poll failed: ${response.statusText}`);
    }

    const data: RunwayTask = await response.json();

    const statusMap: Record<string, GenerationStatus> = {
      PENDING: "queued",
      RUNNING: "processing",
      SUCCEEDED: "completed",
      FAILED: "failed",
      CANCELLED: "failed",
    };

    const status = statusMap[data.status] ?? "processing";
    const videoUrl = data.output && data.output.length > 0 ? data.output[0] : undefined;

    return {
      status,
      videoUrl,
      completedAt: status === "completed" ? Date.now() : undefined,
      error: data.failure,
    };
  }
}
