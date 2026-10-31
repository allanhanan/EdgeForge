# EdgeForge: Vendor-Neutral Edge AI Benchmarking, Optimization & Deployment Intelligence Platform
## Implementation Plan & Architectural Blueprint
**Meta Global AI Developer Hackathon 2026**

---

### 1. Executive Summary & Architecture Overview

EdgeForge is a production-grade, vendor-neutral Edge AI benchmarking, optimization, and deployment platform. It empowers engineers deploying computer vision and edge models to systematically answer:
> **"Which hardware, runtime, and quantization configuration satisfies my deployment latency, accuracy, power, memory, and cost constraints?"**

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       EdgeForge Web UI                                          │
│  (Next.js 15 + React 19 + TypeScript + Tailwind CSS + Lucide + Recharts + TanStack Query)       │
│  - Dashboard  - Models  - Datasets  - Hardware Lab  - Workbench  - Compare  - AI Engineer      │
│  - Experiments  - Deployments  - Reports  - Settings                                            │
└───────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                │ REST API / WebSocket
┌───────────────────────────────────────────────▼─────────────────────────────────────────────────┐
│                                    FastAPI Application Core                                     │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌────────────────────────────────────────┐  │
│  │   Model & Dataset     │ │   Hardware Registry  │ │       Meta AI Deployment Agent         │  │
│  │     Registries        │ │  (Local Probe + Edge │ │ (Muse Spark / LLaMA tool orchestration │  │
│  │ (ONNX Inspector, mAP) │ │    Profiles Engine)  │ │  with deterministic offline fallback)  │  │
│  └───────────────────────┘ └──────────────────────┘ └────────────────────────────────────────┘  │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌────────────────────────────────────────┐  │
│  │   Benchmark Engine    │ │ Optimization Engine  │ │       Recommendation Engine            │  │
│  │ (ORT CPU/GPU, timers, │ │ (ONNX INT8 / FP16,   │ │ (Multi-objective Pareto & constraint   │  │
│  │  p95/p99, GPU stats)  │ │  Graph Optimizer)    │ │  satisfaction ranking)                 │  │
│  └───────────────────────┘ └──────────────────────┘ └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐ ┌────────────────────────────────────────┐  │
│  │         Persistent SQLite/SQLAlchemy DB        │ │       Deployment Packager & Exporter   │  │
│  │       (Models, Datasets, Runs, Artifacts)      │ │   (Self-contained edge bundles + CLI)  │  │
│  └────────────────────────────────────────────────┘ └────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Milestone Phases & Detailed Deliverables

#### Phase 1: Environment, Infrastructure & Project Foundation
- [x] Hardware & environment discovery (Intel i7-14700HX 28T, NVIDIA RTX 4060 8GB, Python 3.11.15 via `uv`, Node v22.22).
- [ ] Initialize monorepo structure:
  - `backend/`: FastAPI, SQLAlchemy, ONNX, PyTorch, PyNVML, Pydantic v2.
  - `frontend/`: Next.js 15, Tailwind CSS, Lucide icons, Recharts, TanStack Query.
  - `sample_assets/`: Curated lightweight YOLO/ResNet ONNX models and sample COCO/YOLO validation datasets with annotations.
- [ ] Create Python environment (`.venv` via `uv` with Python 3.11) with all ML & backend dependencies (`onnx`, `onnxruntime`, `onnxruntime-gpu`, `fastapi`, `uvicorn`, `torch`, `torchvision`, `pynvml`, `psutil`).
- [ ] Create Next.js frontend with Tailwind and TypeScript.

#### Phase 2: Core Backend Engine & Registries
- [ ] SQLAlchemy database schema:
  - `models`: ID, name, format, file path, size, input shapes, output shapes, opset, operators, hash, metadata.
  - `datasets`: ID, name, task, file path, num_samples, classes, annotations_path, format (YOLO/COCO), metadata.
  - `hardware_devices`: Local detected devices (CPU, RTX 4060 GPU) and registered Edge device profiles (Jetson Orin Nano, Jetson AGX Orin, Raspberry Pi 5, Hailo-8 M.2, Intel Core Ultra NPU, Qualcomm Snapdragon X Elite) with accurate status flags (ONLINE, OFFLINE, SIMULATED, UNSUPPORTED).
  - `experiments`: Status, config, timestamps, logs, hardware_id, model_id, dataset_id, precision, batch_size.
  - `benchmark_runs`: Raw timing samples, median_ms, mean_ms, p90_ms, p95_ms, p99_ms, std_ms, fps, memory_mb, power_watts, temp_c, mAP50, mAP50_95, accuracy_metrics.
  - `recommendations`: Goal constraints, selected winner, Pareto trade-offs, agent justification.
  - `agent_traces`: Conversation, tool calls, tool results, agent thinking, timestamps.
- [ ] Model Inspection Engine:
  - Extract ONNX graph: node count, operator histogram (Conv, Relu, Add, etc.), opset version, input/output tensors, shapes, dynamic axes.
  - Safe hash calculation (SHA-256).
- [ ] Hardware Detection Subsystem:
  - Query CPU architecture, core count, frequency, flags (AVX2, AVX512, VNNI).
  - Query NVIDIA GPU (via NVML/nvidia-smi): device name, driver, compute capability, VRAM, power limit.
  - Read-only registry of target edge profiles with realistic constraints (memory, TDP, compute TOPS).

#### Phase 3: Benchmarking Engine, Telemetry & Real Accuracy Evaluation
- [ ] ONNX Runtime Engine:
  - Support `CPUExecutionProvider` and `CUDAExecutionProvider`.
  - Configurable warmup runs (e.g. 10 runs) to warm instruction cache and JIT.
  - Repeated high-resolution measurements using `time.perf_counter_ns()`.
  - Correct CUDA stream synchronization (`torch.cuda.synchronize()` when CUDA provider is active) to prevent premature timer capture.
  - Compute statistics: min, max, mean, median, P90, P95, P99, standard deviation, FPS.
  - Memory profiling (process RSS delta, PyNVML GPU memory allocated).
  - GPU telemetry (power draw in Watts, temperature in Celsius, GPU utilization %).
- [ ] Real Computer Vision Evaluation (mAP calculation):
  - Object detection pipeline for YOLO models.
  - Non-Maximum Suppression (NMS), confidence thresholds.
  - Real IoU calculation against ground truth bounding boxes.
  - Real mAP@0.5 and mAP@0.5:0.95 computation.
  - No synthetic/faked numbers.

#### Phase 4: Model Optimization & Quantization Engine
- [ ] Graph Optimization:
  - Basic / Extended ONNX graph optimizations (constant folding, node fusion).
- [ ] Quantization:
  - INT8 Dynamic Quantization (`onnxruntime.quantization.quantize_dynamic`).
  - INT8 Static Quantization with calibration on validation dataset samples (`onnxruntime.quantization.quantize_static`).
  - FP16 conversion (`onnxconverter_common.float16.convert_float_to_float16`) for GPU/accelerators.
- [ ] Accuracy Regression & Delta Analysis:
  - Measure mAP before and after quantization.
  - Measure latency and size reduction percentage.

#### Phase 5: Recommendation Engine & Pareto Analysis
- [ ] Constraint Evaluation Engine:
  - Evaluates hard constraints: `max_latency_ms`, `min_fps`, `max_memory_mb`, `max_power_w`, `max_accuracy_drop_pct`, `max_cost_usd`.
  - Classifies candidates as `FEASIBLE`, `VIOLATED`, or `UNKNOWN`.
- [ ] Multi-Objective Pareto Frontier:
  - Trade-off analysis: Latency vs. Accuracy vs. Power vs. Memory.
  - Weighted utility scoring function for customizable optimization priorities (Latency-focused, Accuracy-focused, Balanced, Energy-efficient).

#### Phase 6: Meta AI Deployment Engineer
- [ ] Production-shaped Meta Provider:
  - Supports Meta Muse Spark / LLaMA API endpoints via standard HTTP REST schemas.
  - Server-side API key handling with strict validation.
  - Deterministic Offline Agent Engine for zero-credit local operation, maintaining full tool execution capability.
- [ ] Typed Tool Registry:
  - `inspect_model(model_id)`
  - `inspect_onnx_graph(model_id)`
  - `inspect_dataset(dataset_id)`
  - `list_hardware()`
  - `check_runtime_capabilities(device_id)`
  - `check_model_compatibility(model_id, device_id, runtime)`
  - `list_existing_benchmarks(model_id)`
  - `create_experiment(model_id, dataset_id, device_id, precision, ...)`
  - `run_benchmark(experiment_id)`
  - `get_experiment_status(experiment_id)`
  - `inspect_compiler_errors(experiment_id)`
  - `analyze_quantization(model_id, dataset_id, ...)`
  - `compare_runs(run_ids)`
  - `evaluate_constraints(model_id, constraints)`
  - `recommend_hardware(model_id, constraints)`
  - `generate_report(model_id, run_ids)`
  - `export_deployment_package(model_id, run_id)`
- [ ] Agent Reasoning & Observability:
  - Interactive multi-turn chat interface in the frontend.
  - Live tool-execution timeline (Tool Name -> Parameters -> Execution Status -> Structured Output).
  - Explicit evidence citations in the final deployment recommendation.

#### Phase 7: Frontend Application Implementation
- [ ] Design System & Layout:
  - Dark/Light mode theme switch.
  - Sleek top-navigation and sidebar with system status indicators.
  - Modern typography and clean borders.
- [ ] 10 Interactive Pages:
  1. **Dashboard**: Metrics cards, hardware status widget, quick benchmark trigger, recent experiments list, Pareto highlight.
  2. **Models**: Upload dropzone, model cards, tensor shapes, opset info, operator breakdown table.
  3. **Datasets**: Dataset uploader, image preview carousel with ground-truth bounding box overlays, class balance distribution.
  4. **Hardware Lab**: Local detected CPU & GPU cards with real-time specs; Edge profile cards (Jetson, Pi 5, Hailo, Snapdragon) with status pills and capability matrices.
  5. **Benchmark Workbench**: Form to select model, dataset, target hardware, execution provider, precision, warmup/repeat counts; one-click run with live streaming logs.
  6. **Experiments**: Filterable table of all runs, status pills, drill-down modal/page showing raw latency histogram, percentiles (P50/P90/P95/P99), telemetry charts.
  7. **Compare**: Multi-run comparison selector, side-by-side metric tables, interactive Recharts latency vs accuracy scatter plot, Pareto curve.
  8. **AI Engineer**: Meta AI conversation workspace, user prompt input, real-time agent execution trace cards, grounded recommendations with export buttons.
  9. **Deployments**: Package generator, downloadable ZIP bundles containing runtime script, serialized weights, config, checksums, and local verification runner.
  10. **Reports & Settings**: Full exportable benchmark reports (HTML/Markdown/JSON), system diagnostics, Meta API connection tester.

#### Phase 8: Verification, Testing, Demo & Release
- [ ] Backend test suite (pytest):
  - Model inspection tests.
  - Hardware detection tests.
  - Real ONNX Runtime inference & benchmark execution tests.
  - INT8 quantization tests.
  - Real mAP accuracy evaluation tests.
  - Recommendation engine constraint scoring tests.
  - Meta AI tool registry and offline agent execution tests.
- [ ] Frontend build and linting checks.
- [ ] Browser verification via Chrome DevTools / headless test runner with screenshots of key pages.
- [ ] Export package smoke testing: unzip bundle and run `python infer.py` on local machine to verify deployment.
- [ ] Demo script, README.md, and Hackathon presentation assets.

---
### 3. Verification & Acceptance Matrix

| Criterion | Target | Verification Method |
|---|---|---|
| Working Monorepo | Backend + Frontend concurrently operational | Automated launch & healthcheck endpoints |
| Model Inspection | ONNX model graph, opset, inputs/outputs | Pytest + ONNX parser on sample models |
| Hardware Detection | Real local CPU + RTX 4060 GPU detected | API `/api/hardware/detect` output validation |
| Real Benchmarking | Real iterations, P50/P90/P95/P99, FPS | Repeated timers, no hardcoded metrics |
| Real Accuracy | Real mAP@50 and mAP@50:95 on dataset | Ground-truth IoU evaluation pipeline |
| Optimization | Working INT8 dynamic & static quantization | Size reduction & benchmark delta verified |
| AI Engineer | Meta AI tool calling with observable trace | Offline deterministic agent + tool schemas |
| Deployment Export | Working ZIP bundle with inference runner | Local unzipping and CLI inference verification |
| UI Polishing | 10 accessible, responsive pages | Chrome DevTools testing & screenshots |
