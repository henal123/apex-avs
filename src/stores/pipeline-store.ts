import { create } from "zustand";
import type { JobProgress, StageStatus } from "@/types/brand";

interface StageState {
  status: StageStatus;
  jobId: string | null;
  progress: JobProgress | null;
}

interface PipelineState {
  currentStage: number;
  stages: Record<number, StageState>;
  activeJobId: string | null;
  setCurrentStage: (stage: number) => void;
  setStageState: (stage: number, state: Partial<StageState>) => void;
  setActiveJobId: (id: string | null) => void;
  updateProgress: (progress: JobProgress) => void;
  initFromBrand: (pipelineStatus: string, currentStageStatus: StageStatus) => void;
}

function getStageNumber(pipelineStatus: string): number {
  if (pipelineStatus === "complete") return 10;
  const match = pipelineStatus.match(/stage_(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  currentStage: 1,
  stages: Object.fromEntries(
    Array.from({ length: 9 }, (_, i) => [
      i + 1,
      { status: "not_started" as StageStatus, jobId: null, progress: null },
    ])
  ),
  activeJobId: null,

  setCurrentStage: (stage) => set({ currentStage: stage }),

  setStageState: (stage, state) => {
    const stages = { ...get().stages };
    stages[stage] = { ...stages[stage], ...state };
    set({ stages });
  },

  setActiveJobId: (id) => set({ activeJobId: id }),

  updateProgress: (progress) => {
    const stage = get().currentStage;
    const stages = { ...get().stages };
    stages[stage] = { ...stages[stage], progress };
    set({ stages });
  },

  initFromBrand: (pipelineStatus, currentStageStatus) => {
    const currentStage = getStageNumber(pipelineStatus);
    const stages: Record<number, StageState> = {};

    for (let i = 1; i <= 9; i++) {
      if (i < currentStage) {
        stages[i] = { status: "approved", jobId: null, progress: null };
      } else if (i === currentStage) {
        stages[i] = { status: currentStageStatus, jobId: null, progress: null };
      } else {
        stages[i] = { status: "not_started", jobId: null, progress: null };
      }
    }

    set({ currentStage: Math.min(currentStage, 9), stages });
  },
}));
