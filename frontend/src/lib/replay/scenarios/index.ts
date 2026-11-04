import { ReplayScenario } from "../types";
import { featuredEndToEndScenario } from "./featuredEndToEnd";
import { yoloInspectionScenario } from "./yoloInspection";
import { hardwareBenchmarkingScenario } from "./hardwareBenchmarking";
import { precisionOptimizationScenario } from "./precisionOptimization";
import { hardwareComparisonScenario } from "./hardwareComparison";
import { aiEngineerWorkflowScenario } from "./aiEngineerWorkflow";
import { deploymentBundlingScenario } from "./deploymentBundling";

export {
  featuredEndToEndScenario,
  yoloInspectionScenario,
  hardwareBenchmarkingScenario,
  precisionOptimizationScenario,
  hardwareComparisonScenario,
  aiEngineerWorkflowScenario,
  deploymentBundlingScenario,
};

export const FEATURED_SCENARIO_ID = "featured-end-to-end";

export const REPLAY_SCENARIOS: ReplayScenario[] = [
  featuredEndToEndScenario,
  yoloInspectionScenario,
  hardwareBenchmarkingScenario,
  precisionOptimizationScenario,
  hardwareComparisonScenario,
  aiEngineerWorkflowScenario,
  deploymentBundlingScenario,
];

export const DEFAULT_SCENARIO: ReplayScenario = featuredEndToEndScenario;

export function getScenarioById(id: string): ReplayScenario | undefined {
  if (id === "featured-e2e" || id === "featured-end-to-end") return featuredEndToEndScenario;
  if (id === "ai-engineer" || id === "ai-engineer-workflow" || id === "ai-engineer-agent") return aiEngineerWorkflowScenario;
  if (id === "yolo-inspection" || id === "yolo") return yoloInspectionScenario;
  if (id === "hardware-benchmarking" || id === "benchmarking") return hardwareBenchmarkingScenario;
  if (id === "precision-optimization" || id === "quantization") return precisionOptimizationScenario;
  if (id === "hardware-comparison" || id === "compare") return hardwareComparisonScenario;
  if (id === "deployment-bundling" || id === "deployment-bundle" || id === "deployments") return deploymentBundlingScenario;
  return REPLAY_SCENARIOS.find((s) => s.id === id);
}

export function getScenariosByCategory(category: string): ReplayScenario[] {
  return REPLAY_SCENARIOS.filter((s) => s.category === category);
}
