export interface TensorInfo {
  name: string;
  shape: (number | string)[];
  dtype: string;
}

export interface ModelRecord {
  id: string;
  name: string;
  filename: string;
  filepath: string;
  file_size_bytes: number;
  format: string;
  sha256: string;
  opset_version?: number;
  input_shapes: TensorInfo[];
  output_shapes: TensorInfo[];
  operators: Record<string, number>;
  node_count: number;
  task_type: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface DatasetRecord {
  id: string;
  name: string;
  task_type: string;
  format: string;
  filepath: string;
  images_dir: string;
  annotations_path?: string;
  num_samples: number;
  classes: string[];
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface HardwareDevice {
  id: string;
  name: string;
  device_type: "cpu" | "gpu" | "soc" | "npu" | "accelerator";
  vendor: string;
  architecture: string;
  status: "ONLINE" | "OFFLINE" | "SIMULATED" | "UNSUPPORTED";
  is_local: boolean;
  compute_tops?: number;
  memory_mb: number;
  tdp_watts?: number;
  cost_usd?: number;
  supported_runtimes: string[];
  supported_precisions: string[];
  telemetry_supported: boolean;
  details_json: Record<string, unknown>;
  detected_at: string;
}

export interface BenchmarkRun {
  id: string;
  experiment_id: string;
  model_id: string;
  hardware_id: string;
  runtime: string;
  precision: string;
  batch_size: number;
  latency_samples_ms?: number[];
  median_latency_ms: number;
  mean_latency_ms: number;
  p90_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  std_latency_ms: number;
  fps: number;
  memory_rss_mb: number;
  gpu_memory_used_mb?: number;
  avg_power_watts?: number;
  peak_power_watts?: number;
  avg_temperature_c?: number;
  map50?: number;
  map50_95?: number;
  accuracy_loss_pct?: number;
  model_size_mb: number;
  verified: boolean;
  reproducibility_metadata: Record<string, unknown>;
  created_at: string;
}

export interface Experiment {
  id: string;
  name: string;
  model_id: string;
  dataset_id?: string;
  hardware_id: string;
  runtime: string;
  execution_provider: string;
  precision: string;
  batch_size: number;
  iterations: number;
  warmup_iterations: number;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  progress: number;
  error_message?: string;
  logs?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  run?: BenchmarkRun;
}

export interface CandidateScore {
  hardware_id: string;
  hardware_name: string;
  run_id: string;
  precision: string;
  runtime: string;
  latency_ms: number;
  fps: number;
  memory_mb: number;
  power_w?: number;
  map50?: number;
  accuracy_loss_pct?: number;
  cost_usd?: number;
  score: number;
  is_pareto_optimal: boolean;
  violations: string[];
  unknowns: string[];
}

export interface Recommendation {
  id: string;
  objective: string;
  constraints: Record<string, unknown>;
  winner?: CandidateScore;
  pareto_candidates: CandidateScore[];
  violated_candidates: CandidateScore[];
  justification: string;
  created_at: string;
}

export interface AgentTrace {
  step_number: number;
  role: string;
  thought?: string;
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  tool_result?: unknown;
  content?: string;
  status: string;
  created_at: string;
}

export interface AgentResponse {
  session_id: string;
  title: string;
  mode: string;
  reply: string;
  traces: AgentTrace[];
}

export interface MetaStatus {
  provider: string;
  model: string;
  base_url: string;
  configured: boolean;
  mode: string;
  message: string;
}

const API_BASE = "/api/v1";

export async function fetchHealth() {
  const res = await fetch("/health");
  return res.json();
}

export async function fetchHardware(): Promise<HardwareDevice[]> {
  const res = await fetch(`${API_BASE}/hardware`);
  return res.json();
}

export async function detectHardware(): Promise<HardwareDevice[]> {
  const res = await fetch(`${API_BASE}/hardware/detect`, { method: "POST" });
  return res.json();
}

export async function fetchModels(): Promise<ModelRecord[]> {
  const res = await fetch(`${API_BASE}/models`);
  return res.json();
}

export async function seedSampleModel(): Promise<ModelRecord> {
  const res = await fetch(`${API_BASE}/models/seed-sample`, { method: "POST" });
  return res.json();
}

export async function uploadModel(formData: FormData): Promise<ModelRecord> {
  const res = await fetch(`${API_BASE}/models/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Model upload failed");
  }
  return res.json();
}

export async function deleteModel(modelId: string) {
  const res = await fetch(`${API_BASE}/models/${modelId}`, { method: "DELETE" });
  return res.json();
}

export async function fetchDatasets(): Promise<DatasetRecord[]> {
  const res = await fetch(`${API_BASE}/datasets`);
  return res.json();
}

export async function seedSampleDataset(): Promise<DatasetRecord> {
  const res = await fetch(`${API_BASE}/datasets/seed-sample`, { method: "POST" });
  return res.json();
}

export async function fetchDatasetPreview(datasetId: string) {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/preview`);
  return res.json();
}

export async function uploadDataset(formData: FormData): Promise<DatasetRecord> {
  const res = await fetch(`${API_BASE}/datasets/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Dataset upload failed");
  }
  return res.json();
}

export async function fetchExperiments(): Promise<Experiment[]> {
  const res = await fetch(`${API_BASE}/experiments`);
  return res.json();
}

export async function fetchExperiment(experimentId: string): Promise<Experiment> {
  const res = await fetch(`${API_BASE}/experiments/${experimentId}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch experiment");
  }
  return res.json();
}

export async function createExperiment(data: Record<string, unknown>): Promise<Experiment> {
  const res = await fetch(`${API_BASE}/experiments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Experiment creation failed");
  }
  return res.json();
}

export async function runBenchmark(experimentId: string, sync = false) {
  const res = await fetch(`${API_BASE}/benchmarks/run/${experimentId}?sync=${sync}`, {
    method: "POST",
  });
  return res.json();
}

export async function fetchBenchmarkRuns(): Promise<BenchmarkRun[]> {
  const res = await fetch(`${API_BASE}/benchmarks/runs`);
  return res.json();
}

export async function compareRuns(runIds: string[]) {
  const res = await fetch(`${API_BASE}/benchmarks/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(runIds),
  });
  return res.json();
}

export async function quantizeModel(data: {
  model_id: string;
  optimization_type: string;
  register_as_new_model: boolean;
}) {
  const res = await fetch(`${API_BASE}/optimizations/quantize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Quantization failed");
  }
  return res.json();
}

export async function generateRecommendation(data: {
  model_id: string;
  objective: string;
  constraints: Record<string, unknown>;
}): Promise<Recommendation> {
  const res = await fetch(`${API_BASE}/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Recommendation generation failed");
  }
  return res.json();
}

export async function fetchMetaStatus(): Promise<MetaStatus> {
  const res = await fetch(`${API_BASE}/agent/meta-status`);
  return res.json();
}

export async function chatWithAgent(data: {
  session_id?: string;
  message: string;
  model_id?: string;
  constraints?: Record<string, unknown>;
}): Promise<AgentResponse> {
  const res = await fetch(`${API_BASE}/agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Agent chat failed");
  }
  return res.json();
}

export async function exportDeployment(model_id: string, run_id: string) {
  const res = await fetch(`${API_BASE}/deployments/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model_id, run_id }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Export failed");
  }
  return res.json();
}

export async function verifyDeployment(bundle_id: string) {
  const res = await fetch(`${API_BASE}/deployments/verify/${bundle_id}`, {
    method: "POST",
  });
  return res.json();
}

export async function fetchModelReport(modelId: string) {
  const res = await fetch(`${API_BASE}/reports/${modelId}`);
  return res.json();
}

export interface CompatibilityFinding {
  category: string;
  severity: "ERROR" | "WARNING" | "INFORMATION" | "UNVERIFIED";
  message: string;
  remediation: string;
  evidence: string;
}

export interface CompatibilityReport {
  model_id: string;
  hardware_id: string;
  hardware_name: string;
  runtime: string;
  precision: string;
  overall_status: "COMPATIBLE" | "CONDITIONAL" | "INCOMPATIBLE";
  errors_count: number;
  warnings_count: number;
  findings: CompatibilityFinding[];
}

export async function checkCompatibility(data: {
  model_id: string;
  hardware_id: string;
  runtime?: string;
  precision?: string;
}): Promise<CompatibilityReport> {
  const res = await fetch(`${API_BASE}/compatibility/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Compatibility check failed");
  }
  return res.json();
}

export async function fetchCompatibilityMatrix(modelId: string) {
  const res = await fetch(`${API_BASE}/compatibility/matrix/${modelId}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Compatibility matrix fetch failed");
  }
  return res.json();
}
