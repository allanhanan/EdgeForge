import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

console.log("=================================================");
console.log("EdgeForge Replay Engine Deep Verification Suite");
console.log("=================================================");

const BASE = "frontend/src/lib/replay";

// 1. Audit core files
const REQUIRED_FILES = [
  "types.ts",
  "commonData.ts",
  "interceptor.ts",
  "ReplayContext.tsx",
  "index.ts",
  "scenarios/index.ts",
  "scenarios/featuredEndToEnd.ts",
  "scenarios/yoloInspection.ts",
  "scenarios/hardwareBenchmarking.ts",
  "scenarios/precisionOptimization.ts",
  "scenarios/hardwareComparison.ts",
  "scenarios/aiEngineerWorkflow.ts",
  "scenarios/deploymentBundling.ts",
];

for (const rel of REQUIRED_FILES) {
  const p = join(BASE, rel);
  if (!existsSync(p)) {
    console.error(`[FAIL] Missing required replay engine file: ${p}`);
    process.exit(1);
  }
  const content = readFileSync(p, "utf-8");
  console.log(`[PASS] ${rel} verified (${content.length} bytes, ${content.split("\n").length} lines)`);
}

// 2. Validate all 7 Scenario IDs in registry
const scenariosIndex = readFileSync(join(BASE, "scenarios/index.ts"), "utf-8");
const EXPECTED_SCENARIOS = [
  "featuredEndToEndScenario",
  "yoloInspectionScenario",
  "hardwareBenchmarkingScenario",
  "precisionOptimizationScenario",
  "hardwareComparisonScenario",
  "aiEngineerWorkflowScenario",
  "deploymentBundlingScenario",
];

console.log("\n--- Checking Scenario Registry ---");
for (const sc of EXPECTED_SCENARIOS) {
  if (scenariosIndex.includes(sc)) {
    console.log(`[PASS] Registered scenario: ${sc}`);
  } else {
    console.error(`[FAIL] Missing scenario registration: ${sc}`);
    process.exit(1);
  }
}

// 3. Check featuredEndToEnd 11 stages
const featured = readFileSync(join(BASE, "scenarios/featuredEndToEnd.ts"), "utf-8");
const FEATURED_STAGES = [
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

console.log("\n--- Checking 11-Stage Featured Workflow ---");
for (const stg of FEATURED_STAGES) {
  if (featured.includes(stg)) {
    console.log(`[PASS] Featured stage: ${stg}`);
  } else {
    console.error(`[FAIL] Missing featured stage: ${stg}`);
    process.exit(1);
  }
}

// 4. Check API Interceptor Completeness in api.ts
console.log("\n--- Checking API Interceptor Coverage ---");
const apiTs = readFileSync("frontend/src/lib/api.ts", "utf-8");
const INTERCEPTED_APIS = [
  "fetchHealth",
  "fetchHardware",
  "detectHardware",
  "fetchModels",
  "fetchDatasets",
  "fetchExperiments",
  "fetchExperiment",
  "runBenchmark",
  "fetchBenchmarkRuns",
  "compareRuns",
  "quantizeModel",
  "generateRecommendation",
  "fetchMetaStatus",
  "chatWithAgent",
  "exportDeployment",
  "verifyDeployment",
  "fetchModelReport",
  "checkCompatibility",
  "fetchCompatibilityMatrix",
];

for (const fn of INTERCEPTED_APIS) {
  const regex = new RegExp(`export async function ${fn}[\\s\\S]*?isReplayInterceptorActive`);
  if (regex.test(apiTs)) {
    console.log(`[PASS] ${fn} is safely intercepted for Replay Mode`);
  } else {
    console.error(`[FAIL] ${fn} missing isReplayInterceptorActive guard`);
    process.exit(1);
  }
}

// 5. Verify Context Unification
console.log("\n--- Checking Context Unification Bridges ---");
const compContext = readFileSync("frontend/src/components/replay/ReplayContext.tsx", "utf-8");
if (compContext.includes('from "../../lib/replay/ReplayContext"')) {
  console.log("[PASS] components/replay/ReplayContext delegates to lib/replay/ReplayContext");
} else {
  console.error("[FAIL] components/replay/ReplayContext is not bridged");
  process.exit(1);
}

const rootContext = readFileSync("frontend/src/context/ReplayContext.tsx", "utf-8");
if (rootContext.includes('from "../lib/replay/ReplayContext"')) {
  console.log("[PASS] context/ReplayContext delegates to lib/replay/ReplayContext");
} else {
  console.error("[FAIL] context/ReplayContext is not bridged");
  process.exit(1);
}

console.log("\n=================================================");
console.log("✓ ALL REPLAY ARCHITECTURAL CHECKS PASSED (100%)");
console.log("=================================================");
