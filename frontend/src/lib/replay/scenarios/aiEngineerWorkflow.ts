import { ReplayScenario, ReplaySnapshot } from "../types";
import {
  REPLAY_MODELS,
  REPLAY_HARDWARE,
  REPLAY_DATASETS,
  REPLAY_RUNS,
  REPLAY_EXPERIMENTS,
  REPLAY_META_STATUS,
} from "../commonData";

const baseSnapshot: ReplaySnapshot = {
  activeTab: "agent",
  isOnline: true,
  metaStatus: REPLAY_META_STATUS,
  models: REPLAY_MODELS,
  hardware: REPLAY_HARDWARE,
  datasets: REPLAY_DATASETS,
  experiments: REPLAY_EXPERIMENTS,
  runs: REPLAY_RUNS,
  agentTab: {
    sessionId: "session-meta-autonomous-01",
    sessionTitle: "Edge Robotics Sizing & Optimization",
    agentStatus: "idle",
    chatMessages: [],
    traces: [],
    lineageNodes: [],
  },
};

export const aiEngineerWorkflowScenario: ReplayScenario = {
  id: "ai-engineer-workflow",
  title: "Meta AI Copilot Autonomous Workflow",
  shortDescription:
    "Observe Meta AI Deployment Engineer orchestrate 17 typed tools in real-time: graph inspection, hardware discovery, constraint pruning, and Pareto frontier recommendations.",
  category: "agent",
  badgeText: "Agent • Meta AI Copilot",
  iconName: "Bot",
  durationSeconds: 50,
  tags: ["Meta AI", "LLaMA 3.3", "Tool Orchestration", "Agent Traces", "Decision Lineage", "Pareto Recommendation"],
  initialState: baseSnapshot,
  stages: [
    {
      id: "stage-agent-prompt",
      stageNumber: 1,
      title: "Natural Language Deployment Objective",
      subtitle: "Target: Edge Robotics • Latency < 30ms • Throughput >= 30 FPS • Power <= 60W",
      targetTab: "agent",
      durationSeconds: 10,
      startTimeSeconds: 0,
      description:
        "The engineer submits natural language deployment constraints. Meta AI Deployment Engineer initializes its reasoning loop to find the optimal trade-off configuration.",
      keyTakeaway:
        "Engineers express mission-level physical constraints; Meta AI translates them into mathematical filter predicates.",
      actionCallout: "User prompt received. Meta AI Copilot initiating tool planning.",
      snapshot: {
        ...baseSnapshot,
        agentTab: {
          sessionId: "session-meta-autonomous-01",
          sessionTitle: "Edge Robotics Sizing & Optimization",
          agentStatus: "thinking",
          chatMessages: [
            {
              id: "msg-user-goal",
              role: "user",
              content:
                "I need to deploy this YOLO model on an edge robot. My hard constraints: latency must be under 30 ms, throughput at least 30 FPS, and power under 60 watts. Recommend the optimal Pareto configuration.",
              timestamp: "10:30:00",
            },
          ],
          traces: [],
          lineageNodes: [],
        },
      },
      steps: [
        {
          id: "step-agent-prompt-1",
          stepNumber: 1,
          offsetSeconds: 0,
          label: "Submit Objective",
          description: "Submitted robot deployment constraints to Meta AI Copilot.",
          actionType: "agent_prompt",
          actionCallout: "Parsing latency and power constraints.",
        },
      ],
    },
    {
      id: "stage-agent-probe",
      stageNumber: 2,
      title: "Autonomous Silicon & Graph Discovery",
      subtitle: "Tools: inspect_model() & list_hardware() • Telemetry Profiles Checked",
      targetTab: "agent",
      durationSeconds: 12,
      startTimeSeconds: 10,
      description:
        "The agent calls inspect_model() to verify model tensor dimensions, then calls list_hardware() to enumerate physical and simulated silicon candidates in the workspace.",
      keyTakeaway:
        "Transparent tool call audit: judges and engineers inspect exact function arguments, returns, and execution latency.",
      actionCallout: "Executing tool list_hardware() across local and edge silicon registries.",
      snapshot: {
        ...baseSnapshot,
        agentTab: {
          sessionId: "session-meta-autonomous-01",
          sessionTitle: "Edge Robotics Sizing & Optimization",
          agentStatus: "executing_tool",
          activeToolName: "list_hardware",
          activeToolArgs: {},
          chatMessages: [
            {
              id: "msg-user-goal",
              role: "user",
              content:
                "I need to deploy this YOLO model on an edge robot. My hard constraints: latency must be under 30 ms, throughput at least 30 FPS, and power under 60 watts. Recommend the optimal Pareto configuration.",
              timestamp: "10:30:00",
            },
            {
              id: "msg-agent-thinking",
              role: "assistant",
              content:
                "I am probing the model graph and available hardware in your workspace to evaluate constraints...",
              timestamp: "10:30:02",
            },
          ],
          traces: [
            {
              step_number: 1,
              role: "assistant",
              thought: "Inspect target ONNX model to verify task type, input dimensions, and opset.",
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
              created_at: "2026-11-04T10:30:02Z",
            },
            {
              step_number: 2,
              role: "assistant",
              thought: "Enumerate connected local and registered edge hardware targets.",
              tool_name: "list_hardware",
              tool_args: {},
              tool_result: {
                devices_found: 7,
                online_devices: ["cpu-local", "nvidia-rtx4060-local"],
                simulated_devices: ["nvidia-jetson-orin-nano", "hailo-8-m2", "raspberry-pi-5"],
              },
              status: "COMPLETED",
              created_at: "2026-11-04T10:30:05Z",
            },
          ],
          lineageNodes: [],
        },
      },
      steps: [
        {
          id: "step-agent-probe-1",
          stepNumber: 2,
          offsetSeconds: 0,
          label: "Call inspect_model",
          description: "Agent inspected ONNX graph: confirmed 88 layers and 397 KB size.",
          actionType: "agent_tool_call",
          actionCallout: "Tool execution: inspect_model().",
        },
        {
          id: "step-agent-probe-2",
          stepNumber: 3,
          offsetSeconds: 6,
          label: "Call list_hardware",
          description: "Agent discovered 7 candidate devices across 4 compute architectures.",
          actionType: "agent_tool_result",
          actionCallout: "Tool execution: list_hardware().",
        },
      ],
    },
    {
      id: "stage-agent-filter",
      stageNumber: 3,
      title: "Constraint Pruning & Violation Analysis",
      subtitle: "Tool: evaluate_constraints() • Pruning Configurations Over 60W or > 30ms",
      targetTab: "agent",
      durationSeconds: 12,
      startTimeSeconds: 22,
      description:
        "The agent calls evaluate_constraints() with max_latency_ms=30, min_fps=30, and max_power_w=60. RTX 4060 FP32 is eliminated for exceeding 60W, and Raspberry Pi FP32 is eliminated for exceeding 30ms.",
      keyTakeaway:
        "Mathematical elimination prevents deploying models to silicon that would drain robot batteries or miss frame deadlines.",
      actionCallout: "Evaluating constraints: 2 violating configurations mathematically eliminated.",
      snapshot: {
        ...baseSnapshot,
        agentTab: {
          sessionId: "session-meta-autonomous-01",
          sessionTitle: "Edge Robotics Sizing & Optimization",
          agentStatus: "executing_tool",
          activeToolName: "evaluate_constraints",
          activeToolArgs: {
            max_latency_ms: 30.0,
            min_fps: 30.0,
            max_power_w: 60.0,
          },
          chatMessages: [
            {
              id: "msg-user-goal",
              role: "user",
              content:
                "I need to deploy this YOLO model on an edge robot. My hard constraints: latency must be under 30 ms, throughput at least 30 FPS, and power under 60 watts. Recommend the optimal Pareto configuration.",
              timestamp: "10:30:00",
            },
          ],
          traces: [
            {
              step_number: 1,
              role: "assistant",
              thought: "Inspect target ONNX model to verify task type, input dimensions, and opset.",
              tool_name: "inspect_model",
              tool_args: { model_id: "model-yolov8n-fp32" },
              tool_result: {
                model_name: "Edge Tiny YOLO (v8-nano style)",
                format: "onnx",
                opset: 17,
                size_kb: 397,
              },
              status: "COMPLETED",
              created_at: "2026-11-04T10:30:02Z",
            },
            {
              step_number: 2,
              role: "assistant",
              thought: "Enumerate connected local and registered edge hardware targets.",
              tool_name: "list_hardware",
              tool_args: {},
              tool_result: {
                devices_found: 7,
              },
              status: "COMPLETED",
              created_at: "2026-11-04T10:30:05Z",
            },
            {
              step_number: 3,
              role: "assistant",
              thought: "Filter candidate runs against latency, throughput, and power boundaries.",
              tool_name: "evaluate_constraints",
              tool_args: { max_latency_ms: 30.0, min_fps: 30.0, max_power_w: 60.0 },
              tool_result: {
                candidates_evaluated: 9,
                compliant_candidates: [
                  "run-yolo-jetson-nano-int8",
                  "run-yolo-hailo8-int8",
                  "run-yolo-rtx4060-fp16",
                  "run-yolo-rtx4060-int8",
                  "run-yolo-i7-int8",
                ],
                violations: [
                  { run: "run-yolo-rtx4060-fp32", violation: "Power 68.0W > 60.0W limit" },
                  { run: "run-yolo-rpi5-fp32", violation: "Latency 38.4ms > 30.0ms limit" },
                ],
              },
              status: "COMPLETED",
              created_at: "2026-11-04T10:30:10Z",
            },
          ],
          lineageNodes: [],
        },
      },
      steps: [
        {
          id: "step-agent-filter-1",
          stepNumber: 4,
          offsetSeconds: 0,
          label: "Call evaluate_constraints",
          description: "Pruned non-compliant runs exceeding power budget or latency ceiling.",
          actionType: "agent_tool_result",
          actionCallout: "Constraint filtering applied.",
        },
      ],
    },
    {
      id: "stage-agent-pareto",
      stageNumber: 4,
      title: "Pareto Frontier Calculation & Recommendation",
      subtitle: "Winner: NVIDIA Jetson Orin Nano (8GB) INT8 • 4.12 ms • 242.7 FPS • 11.8W",
      targetTab: "agent",
      durationSeconds: 16,
      startTimeSeconds: 34,
      description:
        "The agent calls recommend_hardware(). It identifies NVIDIA Jetson Orin Nano (8GB) with TensorRT INT8 as the non-dominated winner for edge robotics, providing 7.3x latency margin and 5.1x power margin.",
      keyTakeaway:
        "Full technical justification generated: explains latency, FPS, battery life, and accuracy trade-offs.",
      actionCallout: "Agent finalizing Pareto recommendation with technical trade-off justification.",
      snapshot: {
        ...baseSnapshot,
        agentTab: {
          sessionId: "session-meta-autonomous-01",
          sessionTitle: "Edge Robotics Sizing & Optimization",
          agentStatus: "completed",
          chatMessages: [
            {
              id: "msg-user-goal",
              role: "user",
              content:
                "I need to deploy this YOLO model on an edge robot. My hard constraints: latency must be under 30 ms, throughput at least 30 FPS, and power under 60 watts. Recommend the optimal Pareto configuration.",
              timestamp: "10:30:00",
            },
            {
              id: "msg-agent-final",
              role: "assistant",
              content:
                "### Recommendation: NVIDIA Jetson Orin Nano (8GB) with TensorRT INT8\n\nI analyzed your constraints (`Latency < 30ms`, `FPS >= 30`, `Power <= 60W`) against verified benchmark data. **NVIDIA Jetson Orin Nano (8GB)** is the Pareto winner:\n\n- **Median Latency:** `4.12 ms` (7.3x faster than your 30ms deadline)\n- **Throughput:** `242.7 FPS` (8.1x higher than your 30 FPS target)\n- **Power Draw:** `11.8 Watts` (well within your 60W battery budget)\n- **Model Footprint:** `104 KB` (73.8% INT8 compression)\n- **Accuracy Retention:** `0.852 mAP@50` (zero perceptible degradation)\n\n**Next Steps:** Export the certified standalone deployment bundle for instant robot testing.",
              timestamp: "10:30:20",
            },
          ],
          traces: [
            {
              step_number: 4,
              role: "assistant",
              thought: "Calculate non-dominated Pareto frontier points for edge robotics efficiency.",
              tool_name: "recommend_hardware",
              tool_args: { objective: "edge_robotics_efficiency" },
              tool_result: {
                winner: "NVIDIA Jetson Orin Nano (8GB) - TensorRT INT8",
                latency_ms: 4.12,
                fps: 242.7,
                power_w: 11.8,
                justification: "Optimal balance of low power (<15W) and high FPS (>240 FPS).",
              },
              status: "COMPLETED",
              created_at: "2026-11-04T10:30:18Z",
            },
          ],
          lineageNodes: [
            {
              id: "lin-node-1",
              stepNumber: 1,
              label: "Source Model (FP32)",
              type: "source",
              statusText: "Baseline Unquantized",
              latencyMs: 0.84,
              fps: 1189.5,
              mapPercent: 85.4,
              whyAttempted: "Initial uncompressed PyTorch ONNX export.",
              whatHappened: "397 KB weight container.",
              agentLearned: "Universal ONNX operators present.",
              suggestedAction: "Quantize to INT8.",
            },
            {
              id: "lin-node-2",
              stepNumber: 2,
              label: "INT8 Quantized Model",
              type: "success",
              statusText: "73.8% Compression",
              latencyMs: 0.42,
              fps: 2380.0,
              mapPercent: 85.4,
              whyAttempted: "Compress memory footprint for edge devices.",
              whatHappened: "Model size 104 KB, 0.0% mAP loss.",
              agentLearned: "Preserves full detection accuracy.",
              suggestedAction: "Deploy to Jetson silicon.",
            },
            {
              id: "lin-node-3",
              stepNumber: 3,
              label: "Jetson Orin Nano (11.8W)",
              type: "baseline",
              statusText: "Pareto Winner",
              latencyMs: 4.12,
              fps: 242.7,
              mapPercent: 85.2,
              whyAttempted: "Sizing for edge robotics constraints.",
              whatHappened: "242.7 FPS clocked at 11.8 Watts.",
              agentLearned: "Meets all mission criteria with 7.3x margin.",
              suggestedAction: "Generate deployment package.",
            },
          ],
        },
      },
      steps: [
        {
          id: "step-agent-pareto-1",
          stepNumber: 5,
          offsetSeconds: 0,
          label: "Call recommend_hardware",
          description: "Calculated Pareto efficiency winner: Jetson Orin Nano (4.12 ms @ 11.8W).",
          actionType: "agent_recommendation",
          actionCallout: "Pareto frontier winner identified.",
        },
        {
          id: "step-agent-pareto-2",
          stepNumber: 6,
          offsetSeconds: 8,
          label: "Populate Lineage Graph",
          description: "Visual decision lineage tree updated with 3 verified stages.",
          actionType: "agent_lineage_update",
          actionCallout: "Lineage tree populated.",
        },
      ],
    },
  ],
  finalSummary: {
    headline: "Meta AI Copilot Autonomous Reasoning Complete",
    achievements: [
      "Orchestrated 4 typed tools autonomously (inspect_model, list_hardware, evaluate_constraints, recommend_hardware)",
      "Pruned 2 hardware configurations violating latency (>30ms) or thermal (>60W) ceilings",
      "Selected NVIDIA Jetson Orin Nano (8GB) INT8 as non-dominated Pareto winner (4.12 ms @ 11.8W)",
      "Constructed audit-grade decision lineage graph with 0.0% accuracy degradation",
    ],
    metricsAchieved: {
      latency: "4.12 ms (7.3x margin)",
      fps: "242.7 FPS (8.1x margin)",
      compression: "3.81x (-73.8%)",
      power: "11.8 W (5.1x margin)",
      accuracy: "0.852 mAP@50",
    },
    suggestedNextScenarios: ["deployment-bundling", "featured-end-to-end"],
  },
};
