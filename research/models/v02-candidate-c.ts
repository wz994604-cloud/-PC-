import { RESEARCH_CONFIG } from "../config";
import { createV02Model } from "./v02-candidate-b";

/**
 * Calibration candidate only. It runs in shadow mode and must not replace the
 * active model until its locked test and live shadow thresholds are satisfied.
 */
export const v02CandidateC = createV02Model(
  "v0.2-candidate-c",
  RESEARCH_CONFIG.v02CandidateC,
);
