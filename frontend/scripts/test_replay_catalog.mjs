import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

console.log("=================================================");
console.log("EdgeForge Replay Engine & Scenarios Verification");
console.log("=================================================");

const expectedFiles = [
  "src/lib/replay/types.ts",
  "src/lib/replay/commonData.ts",
  "src/lib/replay/interceptor.ts",
  "src/lib/replay/scenarios/featuredEndToEnd.ts",
  "src/lib/replay/scenarios/yoloInspection.ts",
  "src/lib/replay/scenarios/hardwareBenchmarking.ts",
  "src/lib/replay/scenarios/precisionOptimization.ts",
  "src/lib/replay/scenarios/hardwareComparison.ts",
  "src/lib/replay/scenarios/aiEngineerWorkflow.ts",
  "src/lib/replay/scenarios/deploymentBundling.ts",
  "src/lib/replay/scenarios/index.ts",
  "src/lib/replay/ReplayContext.tsx",
  "src/lib/replay/index.ts",
];

let allPassed = true;

for (const relPath of expectedFiles) {
  const fullPath = resolve(root, relPath);
  if (!existsSync(fullPath)) {
    console.error(`[FAIL] Missing file: ${relPath}`);
    allPassed = false;
  } else {
    const content = readFileSync(fullPath, "utf-8");
    console.log(`[PASS] ${relPath} exists (${content.length} bytes, ${content.split("\n").length} lines)`);
  }
}

// Inspect featuredEndToEnd.ts for the 11 required stages
const featuredContent = readFileSync(resolve(root, "src/lib/replay/scenarios/featuredEndToEnd.ts"), "utf-8");
const expectedStageSubstrings = [
  "stage-1-model-inspect",
  "stage-2-onnx-graph",
  "stage-3-configure-hw",
  "stage-4-execute-benchmark",
  "stage-5-explore-results",
  "stage-6-compare-precision",
  "stage-7-open-ai-engineer",
  "stage-8-agent-workflow",
  "stage-9-optimization-lineage",
  "stage-10-deployment-bundle",
  "stage-11-summary",
];

console.log("\n--- Checking 11 Required Featured Stages ---");
for (const stageId of expectedStageSubstrings) {
  if (featuredContent.includes(stageId)) {
    console.log(`[PASS] Featured scenario contains stage: ${stageId}`);
  } else {
    console.error(`[FAIL] Featured scenario missing stage: ${stageId}`);
    allPassed = false;
  }
}

// Check ReplayContext for all required methods
const contextContent = readFileSync(resolve(root, "src/lib/replay/ReplayContext.tsx"), "utf-8");
const expectedMethods = [
  "startReplay",
  "stopReplay",
  "play",
  "pause",
  "resume",
  "togglePlay",
  "restart",
  "setSpeed",
  "seekToTime",
  "seekToStage",
  "nextStep",
  "prevStep",
  "selectScenario",
  "setIsInspecting",
  "isReplayMode",
];

console.log("\n--- Checking ReplayContext Capabilities ---");
for (const m of expectedMethods) {
  if (contextContent.includes(m)) {
    console.log(`[PASS] ReplayContext implements: ${m}`);
  } else {
    console.error(`[FAIL] ReplayContext missing: ${m}`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log("\n=================================================");
  console.log("✓ ALL REPLAY ARCHITECTURE CHECKS PASSED (100%)");
  console.log("=================================================");
  process.exit(0);
} else {
  console.error("\nSome checks failed!");
  process.exit(1);
}
