"use client";

import { usePipelineStore } from "@/stores/pipeline-store";
import { STAGE_NAMES } from "@/types/pipeline";
import { EmptyState } from "@/components/common/empty-state";
import { Construction } from "lucide-react";
import { Stage1Container } from "@/components/stages/stage-1/stage-1-container";
import { Stage2Container } from "@/components/stages/stage-2/stage-2-container";
import { Stage3Container } from "@/components/stages/stage-3/stage-3-container";
import { Stage4Container } from "@/components/stages/stage-4/stage-4-container";
import { Stage5Container } from "@/components/stages/stage-5/stage-5-container";
import { Stage6Container } from "@/components/stages/stage-6/stage-6-container";
import { Stage7Container } from "@/components/stages/stage-7/stage-7-container";
import { BulkGenerationContainer } from "@/components/stages/stage-8/bulk-generation-container";
import { Stage9Container } from "@/components/stages/stage-9/stage-9-container";

export function StageContainer() {
  const { currentStage, stages } = usePipelineStore();
  const stageState = stages[currentStage];

  switch (currentStage) {
    case 1:
      return <Stage1Container />;
    case 2:
      return <Stage2Container />;
    case 3:
      return <Stage3Container />;
    case 4:
      return <Stage4Container />;
    case 5:
      return <Stage5Container />;
    case 6:
      return <Stage6Container />;
    case 7:
      return <Stage7Container />;
    case 8:
      return <BulkGenerationContainer />;
    case 9:
      return <Stage9Container />;
    default:
      return (
        <EmptyState
          icon={<Construction className="h-12 w-12" />}
          title={`Stage ${currentStage}: ${STAGE_NAMES[currentStage]}`}
          description={
            stageState?.status === "not_started"
              ? "This stage will be available after the previous stage is approved."
              : `Status: ${stageState?.status || "unknown"}.`
          }
        />
      );
  }
}
