"use client";

export {
  ReplayProvider,
  useReplay,
  STAGE_DURATION_SECONDS,
  type ReplayProviderProps,
} from "../../lib/replay/ReplayContext";

export {
  type ReplayContextType,
} from "../../lib/replay/types";

import type { ReplayStage, ReplaySnapshot } from "../../lib/replay/types";

export interface ReplayStageWithData extends ReplayStage {
  data: ReplaySnapshot;
}
