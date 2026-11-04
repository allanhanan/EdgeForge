import { ReplayScenario, ReplaySnapshot } from "../types";
import {
  REPLAY_MODELS,
  REPLAY_HARDWARE,
  REPLAY_DATASETS,
  REPLAY_RUNS,
  REPLAY_EXPERIMENTS,
  REPLAY_META_STATUS,
  REPLAY_PACKAGES,
  REPLAY_VERIFICATION_RESULT,
  REPLAY_MANIFEST_JSON,
  REPLAY_INFER_SCRIPT,
  REPLAY_REPORTS,
} from "../commonData";

const baseSnapshot: ReplaySnapshot = {
  activeTab: "dashboard",
  isOnline: true,
  metaStatus: REPLAY_META_STATUS,
  models: REPLAY_MODELS,
  hardware: REPLAY_HARDWARE,
  datasets: REPLAY_DATASETS,
  experiments: REPLAY_EXPERIMENTS,
  runs: REPLAY_RUNS,
  selectedModelId: "model-yolov8n-fp32",
  selectedHardwareId: "cpu-local",
  selectedDatasetId: "dataset-edge-val-12",
  selectedRunId: "run-yolo-i7-fp32",
  selectedExperimentId: "exp-yolo-i7-fp32",
};

export const featuredEndToEndScenario: ReplayScenario = {
  id: "featured-end-to-end",
  title: "Complete EdgeForge Intelligence Workflow",
  shortDescription:
    "An end-to-end 11-step demonstration: YOLO model inspection, live silicon benchmarking, precision quantization, Pareto comparison, Meta AI Copilot orchestration, and certified bundle export.",
  category: "featured",
  badgeText: "Featured • End-to-End",
  iconName: "Zap",
  durationSeconds: 130,
  tags: ["Featured", "End-to-End", "YOLOv8", "Benchmarking", "Quantization", "Meta AI", "Deployment"],
  initialState: baseSnapshot,
  stages: [
    // -------------------------------------------------------------------------
    // Stage 1: Select and inspect a YOLO model
    // -------------------------------------------------------------------------
    {
      id: "stage-1-model-inspect",
      stageNumber: 1,
      title: "Model Inspection & Verification",
      subtitle: "Edge Tiny YOLO (v8-nano style) • 397 KB • 14 Nodes",
      targetTab: "models",
      durationSeconds: 10,
      startTimeSeconds: 0,
      description:
        "Inspect the pre-loaded Edge Tiny YOLO ONNX model. Examine input/output tensor shapes, file size, opset version, and cryptographic SHA-256 checksum.",
      keyTakeaway:
        "Edge Tiny YOLO is lightweight (397 KB) with 1x3x640x640 input resolution and standard anchor-free detection heads.",
      actionCallout: "Auto-discovered Edge Tiny YOLO model. Inspecting tensor shapes and checksums.",
      snapshot: {
        ...baseSnapshot,
        activeTab: "models",
        selectedModelId: "model-yolov8n-fp32",
        modelsTab: {
          selectedModelId: "model-yolov8n-fp32",
          graphModalOpen: false,
          searchFilter: "",
        },
      },
      steps: [
        {
          id: "step-1-1",
          stepNumber: 1,
          offsetSeconds: 0,
          label: "Navigate to Models Tab",
          description: "Opened the model repository and selected Edge Tiny YOLO.",
          actionType: "navigate",
          targetTab: "models",
          actionCallout: "Viewing registered edge models in workspace.",
        },
        {
          id: "step-1-2",
          stepNumber: 2,
          offsetSeconds: 5,
          label: "Inspect Tensor Dimensions",
          description: "Verified Input [1, 3, 640, 640] FP32 and Output [1, 84, 8400] detection grid.",
          actionType: "select_model",
          actionCallout: "Verifying input image dimension and class confidence tensors.",
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Stage 2: Inspect its ONNX graph and compatibility
    // -------------------------------------------------------------------------
    {
      id: "stage-2-onnx-graph",
      stageNumber: 2,
      title: "ONNX Graph & Operator Breakdown",
      subtitle: "32 Conv, 18 Relu, 8 Add, 4 Sigmoid • Universal Operator Profile",
      targetTab: "models",
      durationSeconds: 12,
      startTimeSeconds: 10,
      description:
        "Inspect the computational graph of the model. Verify that all 14 node primitives are supported across edge silicon architectures without unsupported operator exceptions.",
      keyTakeaway:
        "100% operator compatibility across Intel AVX2, NVIDIA TensorRT, and Hailo Dataflow compilers.",
      actionCallout: "Graph inspector opened. Analyzing operator frequency and memory bandwidth bounds.",
      snapshot: {
        ...baseSnapshot,
        activeTab: "models",
        selectedModelId: "model-yolov8n-fp32",
        modelsTab: {
          selectedModelId: "model-yolov8n-fp32",
          graphModalOpen: true,
        },
      },
      steps: [
        {
          id: "step-2-1",
          stepNumber: 3,
          offsetSeconds: 0,
          label: "Open Graph Inspector",
          description: "Loaded deep node-level decomposition of the computational graph.",
          actionType: "select_model",
          actionCallout: "Examining operator distribution and topological execution order.",
        },
        {
          id: "step-2-2",
          stepNumber: 4,
          offsetSeconds: 6,
          label: "Verify Silicon Compatibility",
          description: "Validated zero unsupported operators for x86 CPU, CUDA, and ARM Neon.",
          actionType: "select_hardware",
          actionCallout: "Universal execution compatibility confirmed.",
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Stage 3: Configure hardware and deployment constraints
    // -------------------------------------------------------------------------
    {
      id: "stage-3-configure-hw",
      stageNumber: 3,
      title: "Configure Silicon & Benchmark Parameters",
      subtitle: "Target: Intel Core i7-14700HX (CPUExecutionProvider) • 100 Iterations",
      targetTab: "workbench",
      durationSeconds: 10,
      startTimeSeconds: 22,
      description:
        "Select the local 20-core Intel Core i7 CPU. Set precision to FP32, batch size to 1, configure 10 warmup iterations and 100 test iterations for high-resolution timing.",
      keyTakeaway:
        "Benchmark harnesses are pre-configured with synchronized nanosecond timers and warmup cycles to eliminate cold-start jitter.",
      actionCallout: "Setting target silicon and configuring execution provider parameters.",
      snapshot: {
        ...baseSnapshot,
        activeTab: "workbench",
        selectedModelId: "model-yolov8n-fp32",
        selectedHardwareId: "cpu-local",
        workbenchTab: {
          selectedModelId: "model-yolov8n-fp32",
          selectedHardwareId: "cpu-local",
          selectedDatasetId: "dataset-edge-val-12",
          selectedRuntime: "onnxruntime_cpu",
          selectedPrecision: "fp32",
          batchSize: 1,
          iterations: 100,
          warmupIterations: 10,
          isBenchmarking: false,
          benchmarkProgress: 0,
        },
      },
      steps: [
        {
          id: "step-3-1",
          stepNumber: 5,
          offsetSeconds: 0,
          label: "Navigate to Benchmarks",
          description: "Selected Intel Core i7-14700HX with ONNX Runtime CPUExecutionProvider.",
          actionType: "navigate",
          targetTab: "workbench",
          actionCallout: "Configuring hardware benchmark target.",
        },
        {
          id: "step-3-2",
          stepNumber: 6,
          offsetSeconds: 5,
          label: "Set Run Parameters",
          description: "Configured 10 warmup runs and 100 benchmark iterations.",
          actionType: "configure_benchmark",
          actionCallout: "Benchmarking configuration ready for execution.",
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Stage 4: Execute a benchmark sequence
    // -------------------------------------------------------------------------
    {
      id: "stage-4-execute-benchmark",
      stageNumber: 4,
      title: "Live Bare-Metal Execution",
      subtitle: "Synchronizing Timers • Streaming Real Latency & Memory Telemetry",
      targetTab: "workbench",
      durationSeconds: 12,
      startTimeSeconds: 32,
      description:
        "Execute the benchmark. EdgeForge executes real inference iterations, logs telemetry in real-time, and computes accurate latency distributions.",
      keyTakeaway:
        "No marketing estimates: EdgeForge measures physical silicon latency with nanosecond precision.",
      actionCallout: "Benchmarking in progress. Real-time telemetry streaming from local silicon.",
      snapshot: {
        ...baseSnapshot,
        activeTab: "workbench",
        workbenchTab: {
          selectedModelId: "model-yolov8n-fp32",
          selectedHardwareId: "cpu-local",
          selectedRuntime: "onnxruntime_cpu",
          selectedPrecision: "fp32",
          batchSize: 1,
          iterations: 100,
          warmupIterations: 10,
          isBenchmarking: true,
          benchmarkProgress: 68,
          streamLogs: [
            "[INFO] Initializing ONNX Runtime CPUExecutionProvider",
            "[INFO] Binding thread affinity to Performance cores (P-cores 0-7)",
            "[INFO] Warmup 10 iterations completed",
            "[RUNNING] Iteration 40/100: latency = 0.84 ms (1190.5 FPS)",
            "[RUNNING] Iteration 68/100: latency = 0.83 ms (1204.8 FPS)",
            "[TELEMETRY] CPU Package Power: 42.1 Watts | Temp: 54°C | RSS: 65.2 MB",
          ],
          liveTelemetry: {
            latencyMs: 0.84,
            fps: 1189.5,
            memoryMb: 65.2,
            powerWatts: 42.0,
            tempC: 54.0,
          },
        },
      },
      steps: [
        {
          id: "step-4-1",
          stepNumber: 7,
          offsetSeconds: 0,
          label: "Launch Benchmark Job",
          description: "Initiated live inference loops with high-resolution CPU performance counters.",
          actionType: "start_benchmark",
          actionCallout: "Executing warmup iterations.",
        },
        {
          id: "step-4-2",
          stepNumber: 8,
          offsetSeconds: 6,
          label: "Stream Live Telemetry",
          description: "Monitored memory footprint (65.2 MB) and steady-state latency (0.84 ms).",
          actionType: "stream_telemetry",
          actionCallout: "Streaming real-time hardware telemetry.",
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Stage 5: Explore benchmark results
    // -------------------------------------------------------------------------
    {
      id: "stage-5-explore-results",
      stageNumber: 5,
      title: "Verified Benchmark Results",
      subtitle: "Median Latency: 0.84 ms • 1,189.5 FPS • 65.2 MB Footprint",
      targetTab: "workbench",
      durationSeconds: 10,
      startTimeSeconds: 44,
      description:
        "Review the empirical ground truth results: 0.84 ms median latency, 1,189.5 FPS, with a low 65.2 MB RAM footprint on the Intel i7-14700HX.",
      keyTakeaway:
        "Sub-millisecond inference achieved on general-purpose CPU silicon with lean memory requirements.",
      actionCallout: "Benchmarking completed. Reviewing latency percentiles (P50/P90/P99).",
      snapshot: {
        ...baseSnapshot,
        activeTab: "workbench",
        workbenchTab: {
          selectedModelId: "model-yolov8n-fp32",
          selectedHardwareId: "cpu-local",
          isBenchmarking: false,
          benchmarkProgress: 100,
          latestRunResult: REPLAY_RUNS[0],
          liveTelemetry: {
            latencyMs: 0.84,
            fps: 1189.5,
            memoryMb: 65.2,
            powerWatts: 42.0,
            tempC: 54.0,
          },
        },
      },
      steps: [
        {
          id: "step-5-1",
          stepNumber: 9,
          offsetSeconds: 0,
          label: "Inspect Median Latency",
          description: "Empirical median latency clocked at 0.84 milliseconds.",
          actionType: "complete_benchmark",
          actionCallout: "P50 latency: 0.84 ms verified.",
        },
        {
          id: "step-5-2",
          stepNumber: 10,
          offsetSeconds: 5,
          label: "Examine Percentiles",
          description: "P90: 0.85 ms, P95: 0.86 ms, P99: 0.86 ms — minimal jitter.",
          actionType: "state_patch",
          actionCallout: "Latency distribution exhibits tight standard deviation (0.012 ms).",
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Stage 6: Compare precision configurations
    // -------------------------------------------------------------------------
    {
      id: "stage-6-compare-precision",
      stageNumber: 6,
      title: "Precision & Cross-Hardware Comparison",
      subtitle: "FP32 vs FP16 vs INT8 Across Intel i7, RTX 4060, Jetson Orin & Hailo-8",
      targetTab: "compare",
      durationSeconds: 14,
      startTimeSeconds: 54,
      description:
        "Compare FP32, FP16, and INT8 performance across multiple hardware devices. Observe the 73.8% size reduction of INT8 and 2.1x throughput gain on VNNI cores.",
      keyTakeaway:
        "INT8 quantization halves latency while preserving detection accuracy (0.854 mAP@50).",
      actionCallout: "Multi-run comparison active. Exploring Pareto trade-offs.",
      snapshot: {
        ...baseSnapshot,
        activeTab: "compare",
        compareTab: {
          selectedRunIds: [
            "run-yolo-i7-fp32",
            "run-yolo-i7-int8",
            "run-yolo-rtx4060-fp16",
            "run-yolo-rtx4060-int8",
            "run-yolo-jetson-nano-int8",
            "run-yolo-hailo8-int8",
          ],
          scatterMetricX: "latency",
          scatterMetricY: "power",
          highlightWinnerId: "run-yolo-jetson-nano-int8",
        },
      },
      steps: [
        {
          id: "step-6-1",
          stepNumber: 11,
          offsetSeconds: 0,
          label: "Navigate to Compare Tab",
          description: "Selected 6 benchmark runs across 4 hardware platforms.",
          actionType: "navigate",
          targetTab: "compare",
          actionCallout: "Plotting multi-hardware Pareto frontier.",
        },
        {
          id: "step-6-2",
          stepNumber: 12,
          offsetSeconds: 7,
          label: "Inspect INT8 Speedup",
          description: "Intel i7 INT8 achieves 2,380 FPS (2.0x gain) with 0.42 ms latency.",
          actionType: "compare_precisions",
          actionCallout: "VNNI INT8 quantization delivers 2x speedup at zero accuracy loss.",
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Stage 7: Open AI Engineer
    // -------------------------------------------------------------------------
    {
      id: "stage-7-open-ai-engineer",
      stageNumber: 7,
      title: "Meta AI Copilot Initialization",
      subtitle: "Autonomous Edge Deployment Engineer • Meta Muse Spark Online",
      targetTab: "agent",
      durationSeconds: 10,
      startTimeSeconds: 68,
      description:
        "Open the AI Engineer copilot. Submit an edge robotics deployment requirement with strict constraints: latency < 30ms, throughput > 30 FPS, and power < 60 Watts.",
      keyTakeaway:
        "Meta AI Deployment Engineer orchestrates 17 typed tools to solve edge deployment trade-offs.",
      actionCallout: "Submitting deployment objective and constraints to Meta AI Copilot.",
      snapshot: {
        ...baseSnapshot,
        activeTab: "agent",
        agentTab: {
          sessionId: "session-meta-featured-01",
          sessionTitle: "Edge Robotics Deployment Sizing",
          agentStatus: "thinking",
          chatMessages: [
            {
              id: "msg-user-1",
              role: "user",
              content:
                "I need to deploy this YOLO model on an edge robot. My hard constraints: latency must be under 30 ms, throughput at least 30 FPS, and power under 60 watts. Recommend the optimal Pareto configuration.",
              timestamp: "10:20:00",
            },
          ],
          traces: [],
          lineageNodes: [],
        },
      },
      steps: [
        {
          id: "step-7-1",
          stepNumber: 13,
          offsetSeconds: 0,
          label: "Navigate to AI Engineer",
          description: "Opened the autonomous AI deployment workspace.",
          actionType: "navigate",
          targetTab: "agent",
          actionCallout: "Entering Meta AI Copilot session.",
        },
        {
          id: "step-7-2",
          stepNumber: 14,
          offsetSeconds: 5,
          label: "Submit Edge Robotics Goal",
          description: "User posted constraints: Latency < 30ms, FPS >= 30, Power <= 60W.",
          actionType: "agent_prompt",
          actionCallout: "Meta AI Copilot analyzing constraints.",
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Stage 8: Watch the agent investigate the results and perform its workflow
    // -------------------------------------------------------------------------
    {
      id: "stage-8-agent-workflow",
      stageNumber: 8,
      title: "Autonomous Tool Orchestration",
      subtitle: "17 Tools • Model Inspection, Hardware Probing & Constraint Filtering",
      targetTab: "agent",
      durationSeconds: 16,
      startTimeSeconds: 78,
      description:
        "Watch the Meta AI agent inspect the model graph, query available hardware, evaluate empirical benchmarks, and mathematically compute the Pareto frontier.",
      keyTakeaway:
        "The agent doesn't guess: it executes structured tools to probe hardware and filter invalid configurations.",
      actionCallout: "Agent executing tool evaluate_constraints() to eliminate power-hungry targets.",
      snapshot: {
        ...baseSnapshot,
        activeTab: "agent",
        agentTab: {
          sessionId: "session-meta-featured-01",
          sessionTitle: "Edge Robotics Deployment Sizing",
          agentStatus: "executing_tool",
          activeToolName: "recommend_hardware",
          activeToolArgs: {
            model_id: "model-yolov8n-fp32",
            objective: "latency_and_power",
            constraints: { max_latency_ms: 30, min_fps: 30, max_power_w: 60 },
          },
          chatMessages: [
            {
              id: "msg-user-1",
              role: "user",
              content:
                "I need to deploy this YOLO model on an edge robot. My hard constraints: latency must be under 30 ms, throughput at least 30 FPS, and power under 60 watts. Recommend the optimal Pareto configuration.",
              timestamp: "10:20:00",
            },
            {
              id: "msg-agent-thinking",
              role: "assistant",
              content:
                "I am evaluating your requirements against physical and simulated silicon benchmarks in your workspace. Executing tool sequence to identify non-dominated Pareto candidates...",
              timestamp: "10:20:05",
            },
          ],
          traces: [
            {
              step_number: 1,
              role: "assistant",
              thought: "First, inspect the target ONNX model to verify task type and tensor shapes.",
              tool_name: "inspect_model",
              tool_args: { model_id: "model-yolov8n-fp32" },
              tool_result: {
                model_name: "Edge Tiny YOLO (v8-nano style)",
                format: "onnx",
                opset: 17,
                size_kb: 397,
                operators_count: 88,
              },
              status: "COMPLETED",
              created_at: "2026-11-04T10:20:02Z",
            },
            {
              step_number: 2,
              role: "assistant",
              thought: "Query registered edge hardware devices and their active telemetry profiles.",
              tool_name: "list_hardware",
              tool_args: {},
              tool_result: {
                devices_found: 7,
                online_devices: ["cpu-local", "nvidia-rtx4060-local"],
                simulated_devices: ["nvidia-jetson-orin-nano", "hailo-8-m2", "raspberry-pi-5"],
              },
              status: "COMPLETED",
              created_at: "2026-11-04T10:20:05Z",
            },
            {
              step_number: 3,
              role: "assistant",
              thought: "Evaluate candidate benchmark runs against the user constraints (Latency < 30ms, FPS >= 30, Power <= 60W).",
              tool_name: "evaluate_constraints",
              tool_args: {
                max_latency_ms: 30.0,
                min_fps: 30.0,
                max_power_w: 60.0,
              },
              tool_result: {
                candidates_evaluated: 9,
                compliant_count: 5,
                violations: [
                  { hardware: "nvidia-rtx4060-local", precision: "fp32", violation: "Power 68.0W exceeds 60W limit" },
                  { hardware: "raspberry-pi-5", precision: "fp32", violation: "Latency 38.4ms exceeds 30ms limit (26 FPS)" },
                ],
              },
              status: "COMPLETED",
              created_at: "2026-11-04T10:20:08Z",
            },
            {
              step_number: 4,
              role: "assistant",
              thought: "Execute multi-objective optimization to calculate the Pareto-optimal winner.",
              tool_name: "recommend_hardware",
              tool_args: {
                objective: "edge_robotics_efficiency",
              },
              tool_result: {
                winner_hardware: "NVIDIA Jetson Orin Nano (8GB)",
                winner_precision: "int8",
                winner_runtime: "tensorrt",
                latency_ms: 4.12,
                fps: 242.7,
                power_w: 11.8,
                pareto_rank: 1,
              },
              status: "COMPLETED",
              created_at: "2026-11-04T10:20:12Z",
            },
          ],
          lineageNodes: [],
        },
      },
      steps: [
        {
          id: "step-8-1",
          stepNumber: 15,
          offsetSeconds: 0,
          label: "Tool: inspect_model",
          description: "Agent verified model is compatible ONNX object detector.",
          actionType: "agent_tool_call",
          actionCallout: "Agent inspects model architecture and operators.",
        },
        {
          id: "step-8-2",
          stepNumber: 16,
          offsetSeconds: 5,
          label: "Tool: evaluate_constraints",
          description: "Pruned RTX 4060 FP32 (68W > 60W) and Raspberry Pi FP32 (38.4ms > 30ms).",
          actionType: "agent_tool_result",
          actionCallout: "Filtering out power and latency violations.",
        },
        {
          id: "step-8-3",
          stepNumber: 17,
          offsetSeconds: 11,
          label: "Tool: recommend_hardware",
          description: "Selected NVIDIA Jetson Orin Nano INT8 (4.12 ms @ 11.8 Watts).",
          actionType: "agent_recommendation",
          actionCallout: "Mathematical Pareto winner selected: Jetson Orin Nano INT8.",
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Stage 9: Explore optimization lineage
    // -------------------------------------------------------------------------
    {
      id: "stage-9-optimization-lineage",
      stageNumber: 9,
      title: "Optimization Lineage & Decision Tree",
      subtitle: "Source -> Baseline FP32 -> INT8 QDQ -> Jetson TensorRT Deployment",
      targetTab: "agent",
      durationSeconds: 12,
      startTimeSeconds: 94,
      description:
        "Inspect the visual optimization lineage graph. Review the technical justification for INT8 calibration and why Jetson Orin Nano beats competitors on energy efficiency.",
      keyTakeaway:
        "Complete decision provenance ensures full regulatory and technical auditability for deployed models.",
      actionCallout: "Expanding decision lineage tree. Audit trail confirmed.",
      snapshot: {
        ...baseSnapshot,
        activeTab: "agent",
        agentTab: {
          sessionId: "session-meta-featured-01",
          sessionTitle: "Edge Robotics Deployment Sizing",
          agentStatus: "completed",
          chatMessages: [
            {
              id: "msg-user-1",
              role: "user",
              content:
                "I need to deploy this YOLO model on an edge robot. My hard constraints: latency must be under 30 ms, throughput at least 30 FPS, and power under 60 watts. Recommend the optimal Pareto configuration.",
              timestamp: "10:20:00",
            },
            {
              id: "msg-agent-final",
              role: "assistant",
              content:
                "### Recommendation: NVIDIA Jetson Orin Nano (8GB) with TensorRT INT8\n\nBased on your constraints (Latency < 30ms, FPS > 30, Power < 60W), **NVIDIA Jetson Orin Nano (8GB)** is the clear Pareto frontier winner:\n\n- **Median Latency:** `4.12 ms` (7.3x faster than your 30ms requirement)\n- **Throughput:** `242.7 FPS` (8x higher than your 30 FPS target)\n- **Power Draw:** `11.8 Watts` (well within your 60W battery envelope)\n- **Footprint:** `104 KB` weights / `128 MB RSS` runtime memory\n- **Accuracy:** `0.852 mAP@50` (zero perceptible regression from FP32)\n\nI have generated the deployment bundle ready for field installation.",
              timestamp: "10:20:15",
            },
          ],
          traces: [],
          lineageNodes: [
            {
              id: "lin-1",
              stepNumber: 1,
              label: "Source Model (FP32)",
              type: "source",
              statusText: "Original ONNX Export",
              latencyMs: 0.84,
              fps: 1189.5,
              mapPercent: 85.4,
              whyAttempted: "Initial uncompressed PyTorch ONNX export with FP32 weights.",
              whatHappened: "Model size 397 KB, sub-millisecond execution on host CPU.",
              agentLearned: "Universal ONNX operators present; suitable for quantization.",
              suggestedAction: "Quantize to INT8 for edge deployment.",
            },
            {
              id: "lin-2",
              stepNumber: 2,
              label: "INT8 Dynamic Quantization",
              type: "success",
              statusText: "73.8% Footprint Compression",
              latencyMs: 0.42,
              fps: 2380.0,
              mapPercent: 85.4,
              whyAttempted: "Reduce weight memory footprint and leverage integer SIMD/Tensor Cores.",
              whatHappened: "Footprint dropped to 104 KB with 0.0% mAP regression.",
              agentLearned: "Model maintains full accuracy under symmetric integer quantization.",
              suggestedAction: "Deploy to edge embedded silicon.",
            },
            {
              id: "lin-3",
              stepNumber: 3,
              label: "Jetson Orin Nano Deployment",
              type: "baseline",
              statusText: "Pareto Winner (11.8W)",
              latencyMs: 4.12,
              fps: 242.7,
              mapPercent: 85.2,
              whyAttempted: "Evaluate edge robotics deployment on dedicated 15W SoC.",
              whatHappened: "Achieved 242.7 FPS within 11.8 Watts power draw.",
              agentLearned: "Meets all latency (<30ms) and power (<60W) constraints with 7.3x margin.",
              suggestedAction: "Generate standalone bundle package.",
            },
          ],
        },
      },
      steps: [
        {
          id: "step-9-1",
          stepNumber: 18,
          offsetSeconds: 0,
          label: "Inspect Lineage Nodes",
          description: "Followed progression from FP32 baseline to INT8 Jetson deployment.",
          actionType: "agent_lineage_update",
          actionCallout: "Audit-grade lineage provenance verified.",
        },
        {
          id: "step-9-2",
          stepNumber: 19,
          offsetSeconds: 6,
          label: "Review Recommendation",
          description: "Verified 242.7 FPS at 11.8 Watts satisfies all robotic mission criteria.",
          actionType: "agent_recommendation",
          actionCallout: "Recommendation verified against operational constraints.",
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Stage 10: Generate and inspect the deployment bundle
    // -------------------------------------------------------------------------
    {
      id: "stage-10-deployment-bundle",
      stageNumber: 10,
      title: "Deployment Bundle Packaging & Verification",
      subtitle: "bundle_18e93d8f_jetson_int8.zip • Zero-Copy DMA Automated Verification",
      targetTab: "deployments",
      durationSeconds: 14,
      startTimeSeconds: 106,
      description:
        "Inspect the generated standalone deployment package: model weights, configuration, infer.py, and cryptographic manifest. Run the built-in zero-copy verification smoke test.",
      keyTakeaway:
        "Self-contained zero-dependency bundle runs on target silicon out of the box with zero setup friction.",
      actionCallout: "Deployment bundle created. Executing automated hardware smoke test.",
      snapshot: {
        ...baseSnapshot,
        activeTab: "deployments",
        deploymentsTab: {
          packages: REPLAY_PACKAGES,
          selectedPackageId: "pkg-jetson-orin-yolo-int8",
          selectedBundleId: "bundle_18e93d8f_jetson_int8",
          manifestJson: REPLAY_MANIFEST_JSON,
          inferScript: REPLAY_INFER_SCRIPT,
          verificationResult: REPLAY_VERIFICATION_RESULT,
          isVerifying: false,
        },
      },
      steps: [
        {
          id: "step-10-1",
          stepNumber: 20,
          offsetSeconds: 0,
          label: "Navigate to Deployments",
          description: "Opened the bundle manager with package bundle_18e93d8f_jetson_int8.",
          actionType: "navigate",
          targetTab: "deployments",
          actionCallout: "Viewing deployment artifacts and standalone infer.py script.",
        },
        {
          id: "step-10-2",
          stepNumber: 21,
          offsetSeconds: 7,
          label: "Execute Verification Test",
          description: "Zero-copy verification passed: 10/10 iterations executed, 0 warnings.",
          actionType: "verify_bundle",
          actionCallout: "Automated smoke test passed: bundle is certified production-ready.",
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Stage 11: Finish on a summary of the workflow
    // -------------------------------------------------------------------------
    {
      id: "stage-11-summary",
      stageNumber: 11,
      title: "Workflow Completion & Certification Report",
      subtitle: "Tamper-Evident SHA-256 Signature EF-AUDIT-2026-1104 • Zero-Defect Passed",
      targetTab: "reports",
      durationSeconds: 10,
      startTimeSeconds: 120,
      description:
        "Review the final audit report summarizing empirical benchmarks, INT8 compression ratios, Pareto winner selection, and cryptographic verification stamps.",
      keyTakeaway:
        "EdgeForge transitions edge AI deployment from guesswork into an auditable, empirical science.",
      actionCallout: "Replay complete. Production audit certificate generated.",
      snapshot: {
        ...baseSnapshot,
        activeTab: "reports",
        reportsTab: {
          reports: REPLAY_REPORTS,
          selectedReportId: "report-yolo-edge-audit-2026",
          activeMarkdownContent: REPLAY_REPORTS[0].markdown_content,
        },
      },
      steps: [
        {
          id: "step-11-1",
          stepNumber: 22,
          offsetSeconds: 0,
          label: "Navigate to Reports",
          description: "Opened the formal evaluation and silicon audit report.",
          actionType: "navigate",
          targetTab: "reports",
          actionCallout: "Reviewing signed deployment audit report.",
        },
        {
          id: "step-11-2",
          stepNumber: 23,
          offsetSeconds: 5,
          label: "Attestation Verification",
          description: "Cryptographic signature EF-AUDIT-2026-1104-9988 verified.",
          actionType: "view_report",
          actionCallout: "Demonstration complete. Ready for live inspection or restart.",
        },
      ],
    },
  ],
  finalSummary: {
    headline: "End-to-End EdgeForge Workflow Successfully Demonstrated",
    achievements: [
      "Auto-discovered and profiled Edge Tiny YOLO ONNX model across 7 silicon targets",
      "Achieved sub-millisecond physical latency (0.84 ms) on bare-metal Intel CPU",
      "Applied INT8 quantization with 73.8% footprint reduction and 0.0% mAP regression",
      "Meta AI Copilot autonomously selected NVIDIA Jetson Orin Nano (4.12 ms @ 11.8W)",
      "Exported self-contained deployment bundle verified with zero-copy DMA execution",
      "Generated tamper-evident cryptographic compliance report",
    ],
    metricsAchieved: {
      latency: "0.84 ms (CPU) / 4.12 ms (Jetson)",
      fps: "1,189.5 FPS (CPU) / 242.7 FPS (Jetson)",
      compression: "3.81x (-73.8%)",
      power: "11.8 W on Edge Silicon",
      accuracy: "0.852 mAP@50 (99.8% retained)",
    },
    suggestedNextScenarios: [
      "yolo-inspection",
      "hardware-benchmarking",
      "precision-optimization",
      "hardware-comparison",
      "ai-engineer-workflow",
      "deployment-bundling",
    ],
  },
};
