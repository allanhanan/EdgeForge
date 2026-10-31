# EdgeForge: Hackathon Contribution Ledger & Verification Audit

> **Meta Global AI Developer Hackathon 2026** — *Theme: Push the Frontier*  
> Formal contribution accounting, verification records, compliance audit, and architectural provenance.

---

## 1. Executive Summary of Contributions

All components of **EdgeForge** documented below were authored and implemented specifically for the **Meta Global AI Developer Hackathon 2026**.

EdgeForge delivers an end-to-end, vendor-neutral edge deployment platform that bridges the gap between frontier AI model architecture (Meta Muse Spark / LLaMA API) and real physical silicon execution (CPUs, GPUs, and edge NPUs/SoCs).

---

## 2. Detailed Contribution Breakdown

### A. Core Backend Architecture (FastAPI + Async SQLite)
- **FastAPI Modular Service Core** (`backend/app/main.py`):
  - Application factory with asynchronous database initialization and hardware startup detection hooks.
  - CORS middleware configured for secure cross-origin dashboard communication.
  - Health check (`/health`) and structured exception handling.
- **Async Database Persistence Layer** (`backend/app/core/database.py`, `backend/app/models/entities.py`):
  - Async SQLAlchemy 2.0 engine backed by `aiosqlite`.
  - Comprehensive relational entities: `ModelRecord`, `DatasetRecord`, `HardwareDevice`, `Experiment`, `BenchmarkRun`, `Recommendation`, `AgentSession`, and `AgentTrace`.
- **Type-Safe Pydantic Schemas** (`backend/app/schemas/__init__.py`):
  - Strict input validation and serialization contracts for benchmark executions, multi-dimensional constraints, Pareto recommendations, and agent trace events.

### B. Hardware Probing & Benchmarking Engine
- **Hardware Probing Subsystem** (`backend/app/services/hardware_detector.py`):
  - Native Linux CPU detection via `/proc/cpuinfo` parsing for instruction sets (`AVX2`, `AVX-512`, `VNNI`) and topology (`psutil`).
  - Native NVIDIA GPU probing via NVML C-bindings (`pynvml`/`nvidia-ml-py`) reading driver version, compute capability, VRAM size, and live power states.
  - Curated edge hardware registry for prominent target silicon (NVIDIA Jetson Orin Nano, AGX Orin, Raspberry Pi 5, Hailo-8 M.2, Intel Core Ultra NPU, Qualcomm Snapdragon X Elite).
- **High-Precision Benchmarking Engine** (`backend/app/services/benchmark_engine.py`):
  - Nanosecond-resolution execution timing via `time.perf_counter_ns()`.
  - Warmup iteration loop ensuring instruction and GPU cache stabilization before latency sampling.
  - CUDA stream synchronization barrier ensuring host clock measures full device execution without queueing artifacts.
  - Statistical latency distribution calculations: Median (P50), P90, P95, P99, Mean, Standard Deviation, and Throughput (FPS).
  - Memory RSS tracking and GPU VRAM consumption sampling.

### C. Optimization & Quantization Pipeline
- **ONNX Graph Optimizer** (`backend/app/services/optimizer.py`):
  - Dynamic INT8 quantization (`quantize_dynamic`) converting weight matrices and runtime activations.
  - Static INT8 quantization pipeline supporting calibration datasets via custom `CalibrationDataReader`.
  - Float16 half-precision conversion utilizing ONNX converter utilities for NVIDIA Tensor Cores.
  - Graph constant folding and redundant operator elimination.
  - Automatic model size delta and compression ratio verification.

### D. Computer Vision Accuracy Evaluator
- **Detection Accuracy Engine** (`backend/app/services/accuracy_evaluator.py`):
  - YOLO letterbox canvas resizing preserving bounding box aspect ratios.
  - Vectorized Intersection over Union (IoU) overlap matrix computation.
  - Non-Maximum Suppression (NMS) bounding box deduplication.
  - Full COCO-standard 101-point interpolated Precision-Recall curve calculation.
  - Metrics computation for `mAP@50` and multi-threshold `mAP@50:95`.

### E. Multi-Objective Recommendation & Pareto Frontier
- **Pareto Dominance Engine** (`backend/app/services/recommendation_engine.py`):
  - Multi-objective dominance logic across 4 dimensions: Latency (minimize), Throughput (maximize), Power consumption (minimize), and mAP accuracy (maximize).
  - Hard constraint validation eliminating configurations exceeding latency, memory, power, cost, or accuracy loss thresholds.
  - Dynamic objective weighting engine adapting to user preference (`latency`, `accuracy`, `power`, or `balanced`).
  - Automated natural language justification generation synthesizing trade-offs.

### F. Meta AI Model Integration (Meta Muse Spark & LLaMA)
- **Meta AI Provider Client** (`backend/app/services/meta_provider.py`):
  - Production-grade HTTP client implementing the official Meta Model API schema.
  - Server-side API key isolation (`META_API_KEY`) keeping credentials secure.
  - Offline deterministic fallback mode allowing full autonomous workflow evaluation without external internet access or API credits.
- **Autonomous Deployment Engineer** (`backend/app/services/agent_service.py`):
  - 17 strongly typed tool interfaces covering inspection, benchmarking, quantization, comparison, Pareto ranking, and deployment bundling.
  - Real-time observable reasoning trace recording `thought`, `tool_call`, and `tool_result` sequence items.

### G. Deployment Bundler & Self-Contained Edge Runner
- **Deployment Exporter** (`backend/app/services/exporter.py`):
  - Standalone packaging engine compiling `model.onnx`, `config.json`, `requirements.txt`, `README.md`, and `infer.py`.
  - Self-contained inference runner capable of processing image inputs or executing synthetic edge benchmarks.
  - Automated in-system smoke test runner verifying exported packages prior to distribution.

### H. Modern Web Dashboard (Next.js 16)
- **Interactive UI Subsystem** (`frontend/src/`):
  - Real-time hardware status matrix and silicon capabilities.
  - Interactive Pareto frontier scatter plots and comparative metrics.
  - Live benchmark runner with streaming execution logs.
  - Meta AI Agent chat timeline with visual step-by-step reasoning traces.
  - Export management modal with one-click package download.

---

## 3. Verification & Test Evidence

EdgeForge includes an automated integration and engine verification suite located in `backend/tests/`.

### Automated Test Suite Execution:
```bash
PYTHONPATH=. .venv/bin/pytest backend/tests/ -v
```

### Verification Matrix:
| Test ID | Module | Test Description | Status |
| :--- | :--- | :--- | :---: |
| `TEST-01` | `test_all_engines.py` | ONNX Graph Inspector (opset, shapes, operator counts, SHA-256) | **PASSED** |
| `TEST-02` | `test_all_engines.py` | Hardware Detection (local CPU/GPU probes, edge registry) | **PASSED** |
| `TEST-03` | `test_all_engines.py` | Real Benchmark Execution (warmup, nanosecond timing, P95, RSS) | **PASSED** |
| `TEST-04` | `test_all_engines.py` | Quantization & Compression (INT8 dynamic graph transformation) | **PASSED** |
| `TEST-05` | `test_all_engines.py` | Accuracy Evaluator (box IoU, NMS, 101-point mAP@50 and mAP@50:95) | **PASSED** |
| `TEST-06` | `test_all_engines.py` | Recommendation & Pareto Dominance (hard constraints, frontier selection) | **PASSED** |
| `TEST-07` | `test_all_engines.py` | Deployment Bundler (ZIP packaging, structure validation) | **PASSED** |
| `TEST-08` | `test_api_endpoints.py` | Full End-to-End API Workflow (Health -> HW -> Seed -> Bench -> Pareto -> Agent -> Verify) | **PASSED** |

**Summary: 8 / 8 Tests Passed (100% Pass Rate).**

---

## 4. Empirical Hardware Verification Ledger

All benchmarks below were executed directly on local execution silicon:

- **Host Machine**: x86_64 Linux (Kernel 7.2.0-202.nobara.fc44)
- **Host CPU**: Intel Core i7-14700HX (20 Physical Cores, 28 Threads, AVX2, VNNI)
- **Host GPU**: NVIDIA GeForce RTX 4060 Laptop GPU (8GB GDDR6, Driver 595.91.07, CUDA 12.x)
- **ONNX Runtime Version**: 1.31.1

| Run ID | Silicon Device | Execution Provider | Precision | Model Size | Median Latency | Throughput | Peak Memory | Verified |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `RUN-FP32-CPU` | Intel Core i7-14700HX | `CPUExecutionProvider` | FP32 | 0.38 MB | **0.84 ms** | **1,189.5 FPS** | 65.0 MB RSS | [x] |
| `RUN-INT8-CPU` | Intel Core i7-14700HX | `CPUExecutionProvider` | INT8 (Dyn) | **0.10 MB** | 4.85 ms | 206.1 FPS | 65.0 MB RSS | [x] |
| `RUN-FP32-GPU` | NVIDIA RTX 4060 Laptop | `CUDAExecutionProvider` | FP32 | 0.38 MB | **0.90 ms** | **1,111.9 FPS** | 561.2 MB VRAM | [x] |

---

## 5. Hackathon Compliance Checklist

| Requirement | Status | Evidence / Implementation Notes |
| :--- | :---: | :--- |
| **New Original Code** | **YES** | All backend services, frontend dashboard, and evaluation engines were written specifically for this hackathon. |
| **Theme Alignment ("Push the Frontier")** | **YES** | Empowers frontier AI models (Meta Muse Spark / LLaMA) to autonomously reason over physical silicon trade-offs and drive edge AI deployment. |
| **Meta AI Model Integration** | **YES** | Integrated via the official Meta Model API schema, featuring 17 typed tools, observable traces, and deterministic fallback. |
| **Zero Mock Latency Claims** | **YES** | Local hardware runs real inference loops with nanosecond timers, CUDA stream synchronization, and real memory measurement. |
| **Open Source & Reproducibility** | **YES** | Apache 2.0 license, self-contained sample models and validation datasets, and a single-command test suite (`pytest`). |
| **Security & Credential Safety** | **YES** | Server-side API key isolation; zero credentials or sensitive keys exposed to frontend client code. |
