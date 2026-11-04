export interface ReplayToolEvent {
  stepNumber: number;
  stageName: string;
  toolName: string;
  description: string;
  thought: string;
  durationMs: number;
  timestampOffset: string;
  timestampISO: string;
  agentStatus: string;
  decisionSummary: string;
  status: "SUCCESS" | "FAILED" | "IN_PROGRESS";
  inputArgs: Record<string, unknown>;
  stdoutTrace: string[];
  outputPayload: Record<string, unknown>;
  keyMetrics: { label: string; value: string; color?: string }[];
}

export interface ReplayLineageNode {
  id: string;
  stepNumber: number;
  label: string;
  type: "source" | "baseline" | "regression" | "tuning" | "certified";
  statusText: string;
  badgeColor: string;
  latencyMs: number;
  fps: number;
  mapPercent: number;
  mapDeltaPoints: number;
  modelSizeMb: number;
  powerWatts: number;
  speedupMultiplier: number;
  whyAttempted: string;
  whatHappened: string;
  agentLearned: string;
  suggestedAction: string;
  configuration: {
    format: string;
    precision: string;
    engine: string;
    calibrationMethod?: string;
    runtimeFlags?: string[];
  };
}

export interface ReplayScenarioConfig {
  id: string;
  title: string;
  targetHardware: string;
  powerBudgetWatts: number;
  latencyTargetMs: number;
  fpsTarget: number;
  maxAccuracyDropPct: number;
  userPrompt: string;
  injectedContext: string;
  thinkingMessage: string;
  reasoningStreamTokens: string[];
  tools: ReplayToolEvent[];
  lineageNodes: ReplayLineageNode[];
  synthesisResponse: string;
  finalRecommendations: {
    title: string;
    description: string;
    badge: string;
  }[];
}

export const JETSON_REPLAY_SCENARIO: ReplayScenarioConfig = {
  id: "ai-engineer-opt",
  title: "Autonomous Edge Optimization Sweep: YOLOv8n on Jetson Orin Nano",
  targetHardware: "NVIDIA Jetson Orin Nano 8GB (Ampere Architecture)",
  powerBudgetWatts: 15,
  latencyTargetMs: 25.0,
  fpsTarget: 40.0,
  maxAccuracyDropPct: 1.0,
  userPrompt:
    "Optimize YOLOv8n for real-time robotic defect inspection on NVIDIA Jetson Orin Nano (15W power envelope). Hard SLA constraints: Latency <= 25ms, Throughput >= 40 FPS, Accuracy drop <= 1.0% mAP. Recommend precision, calibration algorithm, and edge deployment container.",
  injectedContext:
    "Model: YOLOv8n (ONNX Opset 17, 225 nodes, 3.2M params) • HW: NVIDIA Jetson Orin Nano 8GB (Ampere 1024 CUDA, 32 Tensor Cores, 15W TDP) • Dataset: Factory Defect Inspection Dataset (500 samples) • SLA: Latency ≤ 25.0ms, FPS ≥ 40.0, mAP drop ≤ 1.0%, Power ≤ 15W",
  thinkingMessage:
    "Agent thinking... Examining FP32 benchmark telemetry and thermal throttling on Jetson Orin Nano",
  reasoningStreamTokens: [
    "Analyzing edge robotic deployment constraints: Jetson Orin Nano has a strict 15W thermal ceiling and 40 TOPS INT8 peak compute envelope.\n",
    "Empirical telemetry check reveals baseline FP32 latency is 45.2ms (22.1 FPS), violating the ≤ 25ms real-time SLA deadline by 20.2ms.\n",
    "Initiating multi-phase optimization sequence:\n",
    "  1. inspect_model_graph: Verify static input tensor [1, 3, 640, 640], compute FLOPs distribution, and isolate bottleneck convolutions.\n",
    "  2. query_benchmark_telemetry: Retrieve empirical P50/P95 latencies, power draw, and junction thermal headroom across FP32, FP16, and INT8.\n",
    "  3. run_int8_quantization_plan: Execute KL-divergence entropy calibration to recover accuracy clipped by naive MinMax quantization.\n",
    "  4. generate_edge_deployment_manifest: Synthesize zero-copy unified memory container spec and standalone TensorRT deployment bundle.\n",
    "Coordinating tool executions...",
  ],
  tools: [
    {
      stepNumber: 1,
      stageName: "Graph Architecture & FLOPs Audit",
      toolName: "inspect_model_graph",
      description:
        "Traverse ONNX computation graph, verify input dimensions [1, 3, 640, 640], inspect floating point ops, and identify bottleneck layers.",
      thought:
        "Audit the ONNX operator graph, static tensor geometry, and convolution kernel FLOP distribution to identify primary latency drivers.",
      durationMs: 18,
      timestampOffset: "T+120ms",
      timestampISO: "2026-11-04T14:02:18.120Z",
      agentStatus: "AUDITING_GRAPH_TOPOLOGY",
      decisionSummary:
        "Confirmed 3.2M parameters across 54 convolutions with static [1, 3, 640, 640] input tensor. Retain full 640x640 resolution to maintain micro-crack detection sensitivity; target convolution layers for INT8 quantization rather than spatial downsampling.",
      status: "SUCCESS",
      inputArgs: {
        model_id: "yolov8n-defect-detector",
        target_format: "ONNX",
        opset_version: 17,
        input_shape: [1, 3, 640, 640],
        inspect_shapes: true,
        identify_bottlenecks: true,
        calculate_flops: true,
      },
      stdoutTrace: [
        "[ONNX_PARSER] Loaded graph 'yolov8n' (397 KB, 225 nodes, 54 weight layers)",
        "[GRAPH_AUDIT] Input 'images': float32[1, 3, 640, 640] - Static batch size verified",
        "[OPSET_CHECK] Target opset 17: All 225 operators supported by TensorRT 8.6+ & ONNX Runtime",
        "[FLOPS_CALC] Total Floating Point Operations: 8.74 GFLOPs across 54 convolution kernels",
        "[BOTTLENECK] Layer 'model.22.cv3.2' (Detection Head Conv2D) accounts for 23.4% of total FLOPs",
        "[BOTTLENECK] Layer 'model.9.cv2.conv' accounts for 18.1% of total FLOPs",
        "[PASS] Zero unsupported operators detected for TensorRT execution provider.",
      ],
      outputPayload: {
        graph_valid: true,
        opset: 17,
        total_nodes: 225,
        weight_layers: 54,
        floating_point_gflops: 8.74,
        parameters_million: 3.2,
        input_tensor: {
          name: "images",
          dtype: "float32",
          shape: [1, 3, 640, 640],
        },
        bottlenecks: [
          {
            layer: "model.22.cv3.2",
            op: "Conv2D",
            pct_flops: 23.4,
            kernel_shape: [3, 3, 128, 256],
          },
          {
            layer: "model.9.cv2.conv",
            op: "Conv2D",
            pct_flops: 18.1,
            kernel_shape: [3, 3, 256, 512],
          },
        ],
        tensorrt_compatible: true,
      },
      keyMetrics: [
        { label: "FLOPs", value: "8.74 GFLOPs", color: "text-[#5794f2]" },
        { label: "Parameters", value: "3.2M", color: "text-white" },
        { label: "Opset", value: "17 (Compatible)", color: "text-[#73bf69]" },
        { label: "Bottleneck", value: "model.22.cv3.2 (23.4%)", color: "text-[#f59f00]" },
      ],
    },
    {
      stepNumber: 2,
      stageName: "Physical Silicon Profiling & Telemetry",
      toolName: "query_benchmark_telemetry",
      description:
        "Retrieve empirical latency percentiles (p50/p95), power consumption, batch throughput, and thermal throttling limits on Jetson Orin Nano.",
      thought:
        "Retrieve empirical benchmark telemetry across FP32, FP16, and INT8 precisions on the Jetson Orin Nano to quantify SLA gaps.",
      durationMs: 32,
      timestampOffset: "T+280ms",
      timestampISO: "2026-11-04T14:02:18.280Z",
      agentStatus: "PROBING_SILICON_TELEMETRY",
      decisionSummary:
        "Empirical physical telemetry shows FP32 (45.2ms) and FP16 (28.1ms) both breach the 25ms SLA. Jetson Orin Nano INT8 achieves 18.4ms (54.3 FPS, 3.8x speedup) at 11.4W with 23.8°C thermal headroom. Reject FP32/FP16; proceed with INT8 TensorRT quantization.",
      status: "SUCCESS",
      inputArgs: {
        target_device: "jetson_orin_nano_8gb",
        model_id: "yolov8n",
        precisions: ["fp32", "fp16", "int8"],
        metrics: [
          "p50_latency_ms",
          "p95_latency_ms",
          "power_watts",
          "fps",
          "thermal_celsius",
        ],
        target_sla: {
          max_latency_ms: 25.0,
          min_fps: 40.0,
          max_power_watts: 15.0,
        },
      },
      stdoutTrace: [
        "[TELEM_DB] Connecting to EdgeForge In-Memory Telemetry Datastore...",
        "[DEVICE_QUERY] Device ID: 'jetson-orin-nano-8gb' (Ampere 1024 CUDA, 32 Tensor Cores)",
        "[RUN_MATCH] Retrieved 3 physical benchmark profiles:",
        "  - FP32 Engine: P50=45.2ms, P95=52.4ms, 22.1 FPS, 14.8W (SLA VIOLATION: Latency > 25ms)",
        "  - FP16 TensorRT: P50=28.1ms, P95=31.4ms, 35.6 FPS, 13.2W (SLA VIOLATION: Latency > 25ms, FPS < 40)",
        "  - INT8 TensorRT (Baseline): P50=18.4ms, P95=20.2ms, 54.3 FPS, 11.4W (SLA PASSED, but requires calibration)",
        "[THERMAL] Max operating junction temp under 15W TDP: 61.2°C (Thermal Headroom: +23.8°C before throttling)",
        "[DECISION] INT8 quantization is mandatory to meet ≤ 25ms latency and ≥ 40 FPS within 15W envelope.",
      ],
      outputPayload: {
        device: "NVIDIA Jetson Orin Nano (8GB)",
        tdp_watts: 15,
        thermal_headroom_celsius: 23.8,
        junction_temp_celsius: 61.2,
        profiles: {
          fp32_baseline: {
            p50_latency_ms: 45.2,
            p95_latency_ms: 52.4,
            fps: 22.1,
            power_watts: 14.8,
            sla_pass: false,
          },
          fp16_tensorrt: {
            p50_latency_ms: 28.1,
            p95_latency_ms: 31.4,
            fps: 35.6,
            power_watts: 13.2,
            sla_pass: false,
          },
          int8_tensorrt: {
            p50_latency_ms: 18.4,
            p95_latency_ms: 20.2,
            fps: 54.3,
            power_watts: 11.4,
            sla_pass: true,
          },
        },
        recommendation:
          "INT8 precision is mandatory to meet ≤25ms latency and ≥40 FPS within 15W envelope.",
      },
      keyMetrics: [
        { label: "FP32 Latency", value: "45.2 ms (Fails)", color: "text-[#f2495c]" },
        { label: "FP16 Latency", value: "28.1 ms (Fails)", color: "text-[#f59f00]" },
        { label: "INT8 Latency", value: "18.4 ms (Passes)", color: "text-[#73bf69]" },
        { label: "Power Draw", value: "11.4 W (<15W)", color: "text-[#73bf69]" },
      ],
    },
    {
      stepNumber: 3,
      stageName: "INT8 Quantization & Calibration Search",
      toolName: "run_int8_quantization_plan",
      description:
        "Execute calibration algorithm, evaluate symmetric vs asymmetric weights, and enforce accuracy tolerance.",
      thought:
        "Perform post-training quantization sweep. Naive MinMax causes severe activation clipping on bounding boxes; apply KL-Divergence Entropy calibration over 500 factory defect images.",
      durationMs: 44,
      timestampOffset: "T+510ms",
      timestampISO: "2026-11-04T14:02:18.510Z",
      agentStatus: "CALIBRATING_INT8_ENTROPY",
      decisionSummary:
        "Naive MinMax INT8 regressed accuracy by -4.5% pts (77.5% mAP, fails SLA). KL-Divergence Entropy calibration over 500 calibration frames recovered mAP to 81.2% (-0.8% pts drop, 94.2% retained). Reject MinMax; adopt KL-Entropy calibration.",
      status: "SUCCESS",
      inputArgs: {
        calibration_algorithm: "entropy_kl_divergence",
        calibration_dataset: "factory_defects_voc_500",
        num_samples: 500,
        weight_quantization: "symmetric_per_channel",
        activation_quantization: "asymmetric_per_tensor",
        accuracy_tolerance_pct: 1.0,
        target_runtime: "tensorrt_int8",
      },
      stdoutTrace: [
        "[QUANT_ENGINE] Initializing TensorRT Int8EntropyCalibrator2...",
        "[CALIB_CACHE] Ingesting 500 calibration frames from Factory Defect Inspection Dataset...",
        "[HISTOGRAM] Generating 2048-bin activation histograms for 54 convolution layers...",
        "[KL_MIN] Minimizing Kullback-Leibler divergence between FP32 & INT8 representations...",
        "[PER-CHANNEL] Applying symmetric signed INT8 quantization to convolution weights (ZeroPoint=0)",
        "[DYNAMIC_ACT] Asymmetric unsigned INT8 scaling computed for activation tensors",
        "[ACC_EVAL] Running mAP validation on holdout test set (500 images):",
        "  - FP32 Baseline mAP@50: 82.0%",
        "  - Naive MinMax INT8 mAP@50: 77.5% (-4.5% pts regression - REJECTED)",
        "  - KL-Entropy INT8 mAP@50: 81.2% (-0.8% pts regression - ACCEPTED: <= 1.0% tolerance)",
        "[SPEEDUP] Quantized model speedup: 3.8x faster than FP32, 94.2% mAP retained across all classes.",
      ],
      outputPayload: {
        status: "CALIBRATION_COMPLETED",
        calibration_method: "KL-Divergence Entropy Calibrator 2",
        calibration_images_used: 500,
        weight_scheme: "symmetric_signed_int8_per_channel",
        activation_scheme: "asymmetric_unsigned_int8",
        accuracy_results: {
          baseline_map50: 0.82,
          naive_int8_map50: 0.775,
          calibrated_int8_map50: 0.812,
          absolute_map_delta_pct: -0.8,
          relative_retention_pct: 94.2,
          within_tolerance: true,
        },
        performance_gains: {
          model_size_mb_before: 14.8,
          model_size_mb_after: 3.9,
          compression_ratio: "3.79x",
          p50_latency_ms: 18.4,
          fps_throughput: 54.3,
          speedup_vs_baseline: "3.8x",
        },
      },
      keyMetrics: [
        { label: "mAP Retention", value: "94.2% (81.2% mAP)", color: "text-[#73bf69]" },
        { label: "mAP Drop", value: "-0.8% pts (≤1.0%)", color: "text-[#73bf69]" },
        { label: "Compression", value: "3.79x (3.9 MB)", color: "text-[#5794f2]" },
        { label: "Speedup", value: "3.8x vs FP32", color: "text-emerald-400" },
      ],
    },
    {
      stepNumber: 4,
      stageName: "Edge Deployment Manifest & Bundling",
      toolName: "generate_edge_deployment_manifest",
      description:
        "Synthesize target edge container specification, TensorRT engine builder flags, and memory limits.",
      thought:
        "Synthesize a zero-copy edge deployment manifest with TensorRT 8.6 builder flags and unified memory limits for Jetson Orin Nano.",
      durationMs: 21,
      timestampOffset: "T+730ms",
      timestampISO: "2026-11-04T14:02:18.730Z",
      agentStatus: "SYNTHESIZING_DEPLOYMENT_MANIFEST",
      decisionSummary:
        "Jetson Orin Nano unified memory architecture allows zero-copy pinned host-device transfers. Synthesized production-ready TensorRT 8.6 plan (model_int8.engine, 3.9 MB) with L4T container configuration, 4096 MB RAM ceiling, and automated health checks.",
      status: "SUCCESS",
      inputArgs: {
        target_platform: "nvidia_jetson_orin_nano",
        jetpack_version: "6.0 (L4T 36.2)",
        runtime: "tensorrt-8.6",
        container_base: "nvcr.io/nvidia/l4t-tensorrt:r8.6.2-devel",
        memory_limit_mb: 4096,
        device_passthrough: ["/dev/nvhost-ctrl", "/dev/nvhost-gpu", "/dev/nvmap"],
        export_format: "standalone_bundle_zip",
      },
      stdoutTrace: [
        "[MANIFEST_GEN] Building edge deployment manifest for Jetson Orin Nano...",
        "[ENGINE_FLAGS] Configured flags: --fp16 --int8 --calibCacheFile=calib.cache --workspace=1024 --builderOptimizationLevel=5",
        "[CONTAINER_SPEC] Base: nvcr.io/nvidia/l4t-tensorrt:r8.6.2-devel with CUDA 12.2 & cuDNN 8.9",
        "[MEMORY_GATE] Enforcing 4096 MB memory ceiling for shared unified LPDDR5",
        "[BUNDLE_ASSETS] Generating standalone bundle files:",
        "  ├── model_int8.engine (compiled TensorRT plan, 3.9 MB)",
        "  ├── infer.py (zero-copy unified memory inference runner)",
        "  ├── docker-compose.edge.yml (Jetson deployment container spec)",
        "  ├── requirements.txt (lightweight python runtime deps)",
        "  └── checksums.sha256 (cryptographic integrity hashes)",
        "[STATUS] Standalone production package ready for edge flashing.",
      ],
      outputPayload: {
        manifest_id: "man-jetson-orin-yolo8-01",
        target_hardware: "NVIDIA Jetson Orin Nano 8GB",
        container_image: "edgeforge/jetson-yolo8n-int8:latest",
        runtime_flags: [
          "--int8",
          "--workspace=1024",
          "--directGPU",
          "--device=/dev/nvhost-gpu",
        ],
        resource_limits: {
          memory_max_mb: 4096,
          cpu_quota: "4.0",
          power_mode: "15W_6CORE",
        },
        bundle_package: {
          zip_archive: "edgeforge-yolov8n-jetson-int8.zip",
          size_mb: 4.1,
          sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          verified_smoke_tested: true,
        },
      },
      keyMetrics: [
        { label: "Target", value: "Jetson Orin Nano", color: "text-[#5794f2]" },
        { label: "Package", value: "4.1 MB ZIP", color: "text-white" },
        { label: "Memory Limit", value: "4096 MB", color: "text-[#8e8e9e]" },
        { label: "Status", value: "Production Certified", color: "text-[#73bf69]" },
      ],
    },
  ],
  lineageNodes: [
    {
      id: "lineage-base-fp32",
      stepNumber: 1,
      label: "Base Model (FP32)",
      type: "baseline",
      statusText: "SLA Violation (45.2 ms)",
      badgeColor: "border-[#f2495c]/50 bg-[#f2495c]/10 text-[#f2495c]",
      latencyMs: 45.2,
      fps: 22.1,
      mapPercent: 82.0,
      mapDeltaPoints: 0.0,
      modelSizeMb: 14.8,
      powerWatts: 14.8,
      speedupMultiplier: 1.0,
      whyAttempted:
        "Establish ground-truth latency, power draw, and detection accuracy baseline on NVIDIA Jetson Orin Nano.",
      whatHappened:
        "Measured 45.2 ms median latency at 22.1 FPS and 14.8W power draw. Detection mAP@50 reached 82.0%.",
      agentLearned:
        "Latency violates the ≤ 25.0 ms real-time robotic SLA by 20.2 ms. Dense 32-bit float matrix multiplications exceed the target hardware's throughput limits.",
      suggestedAction:
        "Evaluate FP16 half-precision and INT8 TensorRT quantization to accelerate inference.",
      configuration: {
        format: "ONNX Opset 17",
        precision: "FP32",
        engine: "ONNX Runtime CPU / CUDA EP",
      },
    },
    {
      id: "lineage-quant-int8",
      stepNumber: 2,
      label: "Quantized INT8 (TensorRT)",
      type: "regression",
      statusText: "Accuracy Regression (-4.5% pts)",
      badgeColor: "border-[#f2495c]/50 bg-[#f2495c]/10 text-[#f2495c]",
      latencyMs: 18.4,
      fps: 54.3,
      mapPercent: 77.5,
      mapDeltaPoints: -4.5,
      modelSizeMb: 3.9,
      powerWatts: 11.2,
      speedupMultiplier: 2.45,
      whyAttempted:
        "Execute rapid post-training INT8 quantization using naive MinMax dynamic calibration to maximize speedup on Orin Tensor Cores.",
      whatHappened:
        "Latency improved to 18.4 ms (54.3 FPS), but detection accuracy degraded severely from 82.0% to 77.5% mAP (-4.5% pts drop).",
      agentLearned:
        "Naive MinMax calibration aggressively clipped activation outliers in the detection head conv layers (`model.22.cv3.2`), causing false negatives on subtle defects. Fails the ≤ 1.0% accuracy drop SLA.",
      suggestedAction:
        "Reject naive MinMax INT8. Apply Kullback-Leibler (KL) divergence entropy calibration with representative calibration imagery.",
      configuration: {
        format: "TensorRT INT8 Plan",
        precision: "INT8 (MinMax)",
        engine: "TensorRT 8.6",
        calibrationMethod: "Naive MinMax Dynamic Range",
      },
    },
    {
      id: "lineage-calib-tuning",
      stepNumber: 3,
      label: "Calibration Tuning",
      type: "tuning",
      statusText: "Accuracy Recovered (-0.8% pts)",
      badgeColor: "border-[#73bf69]/50 bg-[#73bf69]/10 text-[#73bf69]",
      latencyMs: 18.4,
      fps: 54.3,
      mapPercent: 81.2,
      mapDeltaPoints: -0.8,
      modelSizeMb: 3.9,
      powerWatts: 11.4,
      speedupMultiplier: 3.8,
      whyAttempted:
        "Apply KL-Divergence Entropy Calibrator 2 over 500 representative factory defect images with symmetric signed per-channel weights.",
      whatHappened:
        "Latency maintained at 18.4 ms (54.3 FPS), while detection accuracy recovered to 81.2% mAP (-0.8% pts drop vs baseline), preserving 94.2% relative detection accuracy.",
      agentLearned:
        "Entropy histogram calibration successfully preserved outlier activations in detection heads. Strictly satisfies all latency (18.4ms ≤ 25ms) and accuracy drop (0.8% ≤ 1.0%) constraints.",
      suggestedAction:
        "Freeze calibrated scales and generate production edge deployment container manifest.",
      configuration: {
        format: "TensorRT INT8 Plan",
        precision: "INT8 (Entropy KL Calibrated)",
        engine: "TensorRT 8.6",
        calibrationMethod: "KL-Divergence Entropy Calibrator 2 (500 frames)",
      },
    },
    {
      id: "lineage-deploy-ready",
      stepNumber: 4,
      label: "Deployment Ready Package",
      type: "certified",
      statusText: "94.2% mAP Retained • 3.8x Speedup",
      badgeColor: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-bold",
      latencyMs: 18.4,
      fps: 54.3,
      mapPercent: 81.2,
      mapDeltaPoints: -0.8,
      modelSizeMb: 4.1,
      powerWatts: 11.4,
      speedupMultiplier: 3.8,
      whyAttempted:
        "Package calibrated TensorRT engine, zero-copy unified memory inference script, and container manifest into standalone edge ZIP bundle.",
      whatHappened:
        "Generated verified bundle `edgeforge-yolov8n-jetson-int8.zip` (4.1 MB). Smoke-tested in isolated container environment: 18.4 ms P50 latency, 11.4W power, 0 memory leaks.",
      agentLearned:
        "Optimization sequence achieved Pareto superiority: 3.8x latency reduction, 2.45x throughput boost, 73.6% memory reduction, and 94.2% accuracy retention.",
      suggestedAction:
        "Deploy to production Jetson Orin Nano fleet via OTA package manager.",
      configuration: {
        format: "Standalone ZIP Bundle",
        precision: "INT8 / FP16 Mixed Engine",
        engine: "NVIDIA JetPack 6.0 / L4T 36.2",
        runtimeFlags: ["--int8", "--workspace=1024", "--directGPU"],
      },
    },
  ],
  synthesisResponse: `### Autonomous AI Optimization Summary: YOLOv8n on Jetson Orin Nano

**1. SLA Gate Verification Passed:**
- **Latency:** **18.4 ms P50** (passes ≤ 25.0 ms constraint with 6.6 ms headroom)
- **Throughput:** **54.3 FPS** (exceeds ≥ 40.0 FPS target by 14.3 FPS)
- **Accuracy:** **81.2% mAP@50** (retains **94.2%** of baseline detection accuracy; -0.8% pts drop stays strictly inside the ≤ 1.0% SLA limit)
- **Power & Thermal:** **11.4 Watts** under full load, well within the 15W Jetson Orin Nano envelope with 23.8°C thermal headroom.

**2. Key Optimization Milestones:**
1. \`inspect_model_graph\`: Validated static ONNX opset 17 graph (225 nodes, 8.74 GFLOPs). Identified detection head convolution bottleneck (\`model.22.cv3.2\` accounts for 23.4% FLOPs).
2. \`query_benchmark_telemetry\`: Revealed that FP32 baseline (45.2ms) and FP16 (28.1ms) both fail latency constraints on Orin Nano. INT8 TensorRT is mandatory.
3. \`run_int8_quantization_plan\`: Naive MinMax INT8 caused an unacceptable -4.5% pts mAP regression. The agent autonomously pivoted to KL-Divergence Entropy calibration over 500 factory defect images, successfully recovering 3.7% pts mAP while securing a **3.8x speedup**.
4. \`generate_edge_deployment_manifest\`: Synthesized zero-copy TensorRT engine bundle (\`infer.py\`, \`docker-compose.edge.yml\`, 4.1 MB ZIP) ready for edge flashing.

**3. Final Recommendations:**
- Flash the verified \`edgeforge-yolov8n-jetson-int8.zip\` package to the edge robot.
- Set Jetson power mode to \`15W_6CORE\` (\`sudo nvpmodel -m 0 && sudo jetson_clocks\`).
- Deploy with the unified memory ring-buffer runner for deterministic 54 FPS defect inspection.`,
  finalRecommendations: [
    {
      title: "Deploy Calibrated INT8 Engine",
      description:
        "Flash edgeforge-yolov8n-jetson-int8.zip (3.9 MB engine) with verified 18.4ms latency and 94.2% mAP retention.",
      badge: "Production Ready",
    },
    {
      title: "Lock Power Envelope to 15W_6CORE",
      description:
        "Execute 'sudo nvpmodel -m 0' to pin 6-core Cortex-A78AE and 1024-core Ampere GPU at maximum deterministic clock rates.",
      badge: "Deterministic SLA",
    },
    {
      title: "Zero-Copy Unified Memory Pipeline",
      description:
        "Use infer.py with pinned host-device unified buffers to eliminate PCI copy overhead on the Tegra SoC.",
      badge: "Zero Memory Copy",
    },
  ],
};
