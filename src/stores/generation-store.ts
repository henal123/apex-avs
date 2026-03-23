import { create } from "zustand";
import type { ImageModel } from "@/types/generation";

interface GenerationState {
  globalModel: ImageModel;
  perConceptModel: Record<number, ImageModel>;
  setGlobalModel: (model: ImageModel) => void;
  setConceptModel: (concept: number, model: ImageModel) => void;
  getModelForConcept: (concept: number) => ImageModel;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  globalModel: "nano-banana-pro",
  perConceptModel: {},
  setGlobalModel: (model) => set({ globalModel: model }),
  setConceptModel: (concept, model) =>
    set({ perConceptModel: { ...get().perConceptModel, [concept]: model } }),
  getModelForConcept: (concept) =>
    get().perConceptModel[concept] || get().globalModel,
}));
