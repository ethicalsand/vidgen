import { GenerationRequest, GenerationRecord } from "../types";

export interface VideoProvider {
  name: string;
  startGeneration(request: GenerationRequest): Promise<string>;
  pollStatus(internalId: string): Promise<Partial<GenerationRecord>>;
}
