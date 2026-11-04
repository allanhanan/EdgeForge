"""
Replay Mode API Endpoints for EdgeForge.
Allows judges and visitors to explore edge hardware benchmarking,
optimization, and agent reasoning without live hardware or API credentials.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/replay", tags=["replay"])

class ReplayStageSummary(BaseModel):
    id: str
    scenario_id: str
    stage_index: int
    title: str
    badge: str
    summary: str
    target_tab: str

class ReplayScenarioSummary(BaseModel):
    id: str
    title: str
    tagline: str
    description: str
    icon: str
    stage_count: int
    stages: List[ReplayStageSummary]

class ReplayStatusResponse(BaseModel):
    status: str
    version: str
    mode: str
    isolated: bool
    requires_auth: bool
    requires_hardware: bool
    requires_api_key: bool
    scenario_count: int

SCENARIOS_DATA: Dict[str, Dict[str, Any]] = {
    "featured-e2e": {
        "id": "featured-e2e",
        "title": "Featured End-to-End Walkthrough",
        "tagline": "Full Edge AI deployment pipeline from ONNX model to edge silicon verification.",
        "description": "Walks through model architecture inspection, multi-silicon profiling, INT8 quantization, Pareto frontier selection, and standalone deployment bundle export.",
        "icon": "Sparkles",
        "stages": [
            {
                "id": "stage-e2e-1",
                "scenario_id": "featured-e2e",
                "stage_index": 0,
                "title": "Model Ingestion & Graph Inspection",
                "badge": "Model Ingestion",
                "summary": "Inspect Edge Tiny YOLO ONNX graph: static 1x3x640x640 tensor shapes and 14 operator types.",
                "target_tab": "models",
            },
            {
                "id": "stage-e2e-2",
                "scenario_id": "featured-e2e",
                "stage_index": 1,
                "title": "Silicon Auto-Discovery",
                "badge": "Hardware Discovery",
                "summary": "Auto-detect Intel Core i7 CPU, NVIDIA RTX 4060 GPU, Raspberry Pi 5 + Hailo-8 NPU, and Jetson Orin Nano.",
                "target_tab": "hardware",
            },
            {
                "id": "stage-e2e-3",
                "scenario_id": "featured-e2e",
                "stage_index": 2,
                "title": "Bare-Metal Benchmark Run",
                "badge": "Silicon Profiling",
                "summary": "Profile FP32 latency (0.84ms, 1,189 FPS) and memory footprint on physical host silicon.",
                "target_tab": "workbench",
            },
            {
                "id": "stage-e2e-4",
                "scenario_id": "featured-e2e",
                "stage_index": 3,
                "title": "INT8 Dynamic Quantization",
                "badge": "Compression & mAP",
                "summary": "Compress model by 73.7% (397 KB -> 104 KB) with zero mAP regression on validation images.",
                "target_tab": "workbench",
            },
            {
                "id": "stage-e2e-5",
                "scenario_id": "featured-e2e",
                "stage_index": 4,
                "title": "Multi-Device Pareto Analysis",
                "badge": "Pareto Analysis",
                "summary": "Plot latency vs throughput vs power draw trade-off across 4 silicon candidates.",
                "target_tab": "compare",
            },
            {
                "id": "stage-e2e-6",
                "scenario_id": "featured-e2e",
                "stage_index": 5,
                "title": "Meta AI Engineer Orchestration",
                "badge": "AI Agent Reasoning",
                "summary": "17-tool autonomous agent trace analyzes robotics SLA constraints and recommends Hailo-8 M.2.",
                "target_tab": "agent",
            },
            {
                "id": "stage-e2e-7",
                "scenario_id": "featured-e2e",
                "stage_index": 6,
                "title": "Production Deployment Bundle",
                "badge": "Bundle Verification",
                "summary": "Generate standalone deployment bundle with SHA256 checksums, C++ runtime, and Docker recipe.",
                "target_tab": "deployments",
            },
        ],
    },
    "yolo-inspection": {
        "id": "yolo-inspection",
        "title": "YOLO Inspection & Architecture Analysis",
        "tagline": "Deep-dive into ONNX node topology, tensor dimensions, and operator support.",
        "description": "Inspect Conv, BatchNorm, SiLU, MaxPool, and Concat operators, static shape constraints, and memory allocation requirements.",
        "icon": "Layers",
        "stages": [
            {
                "id": "stage-yolo-1",
                "scenario_id": "yolo-inspection",
                "stage_index": 0,
                "title": "ONNX Model Topology",
                "badge": "Graph Topology",
                "summary": "Review 14 distinct ONNX operators and 416x416 static input shapes for low-latency robotics inference.",
                "target_tab": "models",
            },
            {
                "id": "stage-yolo-2",
                "scenario_id": "yolo-inspection",
                "stage_index": 1,
                "title": "Hardware Compatibility Check",
                "badge": "Silicon Compatibility",
                "summary": "Verify operator compatibility against Hailo-8 dataflow compiler and NVIDIA TensorRT 10.x.",
                "target_tab": "models",
            },
            {
                "id": "stage-yolo-3",
                "scenario_id": "yolo-inspection",
                "stage_index": 2,
                "title": "Dynamic Shape Diagnostics",
                "badge": "Shape Validation",
                "summary": "Validate zero dynamic axes to guarantee deterministic execution without NPU compiler fallback.",
                "target_tab": "workbench",
            },
        ],
    },
    "hardware-benchmarking": {
        "id": "hardware-benchmarking",
        "title": "Hardware Silicon Benchmarking",
        "tagline": "Empirical profiling of latency P50/P95, throughput FPS, and power draw.",
        "description": "Compare real-world performance on physical hardware: Intel Core i7, NVIDIA RTX 4060, Raspberry Pi 5 + Hailo-8 NPU, and Jetson Orin Nano.",
        "icon": "Cpu",
        "stages": [
            {
                "id": "stage-hw-1",
                "scenario_id": "hardware-benchmarking",
                "stage_index": 0,
                "title": "Silicon Inventory & Telemetry",
                "badge": "Telemetry Discovery",
                "summary": "Probing NVML, RAPL power counters, and VNNI vector instruction sets across all connected devices.",
                "target_tab": "hardware",
            },
            {
                "id": "stage-hw-2",
                "scenario_id": "hardware-benchmarking",
                "stage_index": 1,
                "title": "Host CPU Baseline (AVX2 / VNNI)",
                "badge": "CPU Profiling",
                "summary": "Execute 100 warmup and 500 timed runs on 20-core Intel i7: 0.84 ms median, 65 MB RSS.",
                "target_tab": "workbench",
            },
            {
                "id": "stage-hw-3",
                "scenario_id": "hardware-benchmarking",
                "stage_index": 2,
                "title": "Hailo-8 M.2 Edge NPU (8W TDP)",
                "badge": "NPU Profiling",
                "summary": "Execute benchmark on Hailo-8 dataflow architecture: 2.10 ms median, 476.2 FPS, 8.2W power draw.",
                "target_tab": "workbench",
            },
            {
                "id": "stage-hw-4",
                "scenario_id": "hardware-benchmarking",
                "stage_index": 3,
                "title": "Jetson Orin Nano (TensorRT FP16)",
                "badge": "Edge GPU Profiling",
                "summary": "Profile Jetson Orin Nano: 1.45 ms latency, 689.6 FPS, 12.4W TDP, 1024 CUDA cores.",
                "target_tab": "workbench",
            },
        ],
    },
    "precision-optimization": {
        "id": "precision-optimization",
        "title": "Precision Optimization (FP32 -> FP16 -> INT8)",
        "tagline": "Dynamic and post-training quantization with automated mAP validation.",
        "description": "Quantize weights and activations to INT8, profile memory reduction, and verify zero detection accuracy degradation.",
        "icon": "Sliders",
        "stages": [
            {
                "id": "stage-prec-1",
                "scenario_id": "precision-optimization",
                "stage_index": 0,
                "title": "FP32 Unquantized Baseline",
                "badge": "FP32 Baseline",
                "summary": "Baseline model footprint: 397 KB, mAP@50: 0.854, mAP@50:95: 0.612.",
                "target_tab": "models",
            },
            {
                "id": "stage-prec-2",
                "scenario_id": "precision-optimization",
                "stage_index": 1,
                "title": "INT8 Dynamic Quantization",
                "badge": "Graph Quantization",
                "summary": "Insert QuantizeLinear and DequantizeLinear operators; model shrinks to 104 KB (73.7% reduction).",
                "target_tab": "workbench",
            },
            {
                "id": "stage-prec-3",
                "scenario_id": "precision-optimization",
                "stage_index": 2,
                "title": "Validation Dataset Evaluation",
                "badge": "Accuracy Verification",
                "summary": "Run 12-frame edge vision benchmark validation: 0.0% accuracy degradation confirmed.",
                "target_tab": "workbench",
            },
        ],
    },
    "hardware-comparison": {
        "id": "hardware-comparison",
        "title": "Hardware Comparison & Pareto Analysis",
        "tagline": "Multi-device benchmark comparison matrix, throughput vs TDP, and Pareto frontier.",
        "description": "Analyze trade-offs between throughput (FPS), P95 latency (ms), energy efficiency (FPS/Watt), and total hardware cost ($).",
        "icon": "GitCompare",
        "stages": [
            {
                "id": "stage-comp-1",
                "scenario_id": "hardware-comparison",
                "stage_index": 0,
                "title": "Multi-Device Comparison Matrix",
                "badge": "Metrics Matrix",
                "summary": "Compare Intel i7, RTX 4060, Raspberry Pi 5 + Hailo-8, and Jetson Orin Nano across 8 key metrics.",
                "target_tab": "compare",
            },
            {
                "id": "stage-comp-2",
                "scenario_id": "hardware-comparison",
                "stage_index": 1,
                "title": "Latency vs Accuracy Pareto Frontier",
                "badge": "Pareto Frontier",
                "summary": "Visualize non-dominated Pareto solutions balancing real-time robotics SLA vs detection accuracy.",
                "target_tab": "compare",
            },
            {
                "id": "stage-comp-3",
                "scenario_id": "hardware-comparison",
                "stage_index": 2,
                "title": "Energy Efficiency & Cost / FPS",
                "badge": "Efficiency Index",
                "summary": "Hailo-8 delivers 58.1 FPS/Watt at $160 unit cost, achieving top edge deployment efficiency.",
                "target_tab": "compare",
            },
        ],
    },
    "ai-engineer": {
        "id": "ai-engineer",
        "title": "AI Engineer Autonomous Agent",
        "tagline": "Autonomous edge deployment agent with observable multi-step tool execution.",
        "description": "Watch Meta AI Engineer query hardware capabilities, run compatibility checks, perform Pareto frontier analysis, and synthesize optimal deployment recipes.",
        "icon": "Bot",
        "stages": [
            {
                "id": "stage-agent-1",
                "scenario_id": "ai-engineer",
                "stage_index": 0,
                "title": "Robotics Deployment SLA Prompt",
                "badge": "Constraint Ingestion",
                "summary": "User prompt: latency <= 30ms, FPS >= 30, power <= 15W, budget <= $500 for autonomous drone payload.",
                "target_tab": "agent",
            },
            {
                "id": "stage-agent-2",
                "scenario_id": "ai-engineer",
                "stage_index": 1,
                "title": "Autonomous Tool Execution Trace",
                "badge": "Tool Invocation",
                "summary": "Agent calls inspect_model, list_hardware, query_benchmarks, and filter_pareto_candidates in real-time.",
                "target_tab": "agent",
            },
            {
                "id": "stage-agent-3",
                "scenario_id": "ai-engineer",
                "stage_index": 2,
                "title": "Pareto Optimization Synthesis",
                "badge": "Decision Synthesis",
                "summary": "Agent synthesizes winning recommendation: Raspberry Pi 5 + Hailo-8 M.2 (2.1ms latency, 8.2W TDP, $160).",
                "target_tab": "agent",
            },
        ],
    },
    "deployment-bundling": {
        "id": "deployment-bundling",
        "title": "Deployment Bundling & Verification",
        "tagline": "Standalone C++ and Python deployment bundles with cryptographic integrity checks.",
        "description": "Export self-contained deployment packages including ONNX models, runtime wrappers, test harnesses, and Docker recipes.",
        "icon": "Package",
        "stages": [
            {
                "id": "stage-dep-1",
                "scenario_id": "deployment-bundling",
                "stage_index": 0,
                "title": "Target Silicon Configuration",
                "badge": "Export Target",
                "summary": "Select Hailo-8 M.2 target with INT8 quantized Edge Tiny YOLO model and ONNX Runtime / HailoRT.",
                "target_tab": "deployments",
            },
            {
                "id": "stage-dep-2",
                "scenario_id": "deployment-bundling",
                "stage_index": 1,
                "title": "Standalone Bundle Generation",
                "badge": "Package Creation",
                "summary": "Package infer.py, edge_tiny_yolo.onnx, model metadata, and Dockerfile into standalone ZIP.",
                "target_tab": "deployments",
            },
            {
                "id": "stage-dep-3",
                "scenario_id": "deployment-bundling",
                "stage_index": 2,
                "title": "Cryptographic Verification & Smoke Test",
                "badge": "Integrity Check",
                "summary": "Verify SHA256 integrity, runtime dependency check, and simulated inference smoke test.",
                "target_tab": "deployments",
            },
        ],
    },
}

@router.get("/status", response_model=ReplayStatusResponse)
async def get_replay_status():
    """Return status of EdgeForge Replay Mode engine."""
    return {
        "status": "ready",
        "version": "1.0.0",
        "mode": "ISOLATED_REPLAY",
        "isolated": True,
        "requires_auth": False,
        "requires_hardware": False,
        "requires_api_key": False,
        "scenario_count": len(SCENARIOS_DATA),
    }

@router.get("/scenarios", response_model=List[ReplayScenarioSummary])
async def list_replay_scenarios():
    """List all available replay scenarios with stage definitions."""
    res = []
    for sc_id, sc in SCENARIOS_DATA.items():
        res.append({
            "id": sc["id"],
            "title": sc["title"],
            "tagline": sc["tagline"],
            "description": sc["description"],
            "icon": sc["icon"],
            "stage_count": len(sc["stages"]),
            "stages": sc["stages"],
        })
    return res

@router.get("/scenarios/{scenario_id}")
async def get_replay_scenario(scenario_id: str):
    """Get full scenario details and stages by scenario ID."""
    if scenario_id not in SCENARIOS_DATA:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")
    return SCENARIOS_DATA[scenario_id]
