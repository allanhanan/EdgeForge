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
} from "../commonData";

const baseSnapshot: ReplaySnapshot = {
  activeTab: "deployments",
  isOnline: true,
  metaStatus: REPLAY_META_STATUS,
  models: REPLAY_MODELS,
  hardware: REPLAY_HARDWARE,
  datasets: REPLAY_DATASETS,
  experiments: REPLAY_EXPERIMENTS,
  runs: REPLAY_RUNS,
  selectedModelId: "model-yolov8n-int8",
  selectedHardwareId: "nvidia-jetson-orin-nano",
  selectedRunId: "run-yolo-jetson-nano-int8",
  deploymentsTab: {
    packages: REPLAY_PACKAGES,
    selectedPackageId: "pkg-jetson-orin-yolo-int8",
    selectedBundleId: "bundle_18e93d8f_jetson_int8",
    manifestJson: REPLAY_MANIFEST_JSON,
    inferScript: REPLAY_INFER_SCRIPT,
    verificationResult: null,
    isVerifying: false,
  },
};

export const deploymentBundlingScenario: ReplayScenario = {
  id: "deployment-bundling",
  title: "Deployment Packaging & Zero-Copy Verification",
  shortDescription:
    "Formulate a standalone zero-dependency edge deployment package for Jetson Orin Nano INT8. Inspect cryptographic manifests and run automated zero-copy DMA smoke tests.",
  category: "deployment",
  badgeText: "Deployment • Verification",
  iconName: "Package",
  durationSeconds: 40,
  tags: ["Deployment", "Bundle", "Zero-Copy DMA", "TensorRT INT8", "Smoke Test", "Certification"],
  initialState: baseSnapshot,
  stages: [
    {
      id: "stage-deploy-package",
      stageNumber: 1,
      title: "Standalone Bundle Formulation",
      subtitle: "Package: bundle_18e93d8f_jetson_int8.zip (145 KB) • Target: NVIDIA Jetson Orin Nano",
      targetTab: "deployments",
      durationSeconds: 10,
      startTimeSeconds: 0,
      description:
        "Package the optimized INT8 YOLO model, runtime configurations, and standalone inference script into a self-contained ZIP bundle.",
      keyTakeaway:
        "Standalone bundle has zero framework dependencies outside ONNX Runtime / TensorRT execution providers.",
      actionCallout: "Generating portable deployment package for Jetson Orin Nano target.",
      snapshot: {
        ...baseSnapshot,
      },
      steps: [
        {
          id: "step-deploy-pkg-1",
          stepNumber: 1,
          offsetSeconds: 0,
          label: "Formulate Bundle",
          description: "Created bundle_18e93d8f_jetson_int8.zip containing 6 deployment assets.",
          actionType: "export_bundle",
          actionCallout: "Bundle formulation complete.",
        },
      ],
    },
    {
      id: "stage-deploy-inspect",
      stageNumber: 2,
      title: "Artifact Inspection & Manifest Digests",
      subtitle: "model.onnx, config.json, infer.py, manifest.json, requirements.txt",
      targetTab: "deployments",
      durationSeconds: 10,
      startTimeSeconds: 10,
      description:
        "Inspect the contents of the deployment bundle. Verify cryptographic SHA-256 digests in manifest.json and review the generated infer.py standalone script.",
      keyTakeaway:
        "Tamper-evident manifest guarantees that deployed weights and configurations match the certified benchmark run.",
      actionCallout: "Viewing standalone inference script and SHA-256 verification hashes.",
      snapshot: {
        ...baseSnapshot,
      },
      steps: [
        {
          id: "step-deploy-ins-1",
          stepNumber: 2,
          offsetSeconds: 0,
          label: "Inspect manifest.json",
          description: "Verified SHA-256 digests for model.onnx and runtime hyperparameters.",
          actionType: "state_patch",
          actionCallout: "Cryptographic manifest verified.",
        },
      ],
    },
    {
      id: "stage-deploy-verify",
      stageNumber: 3,
      title: "Automated Hardware Smoke Test",
      subtitle: "Zero-Copy DMA Pinned Memory Verified • 10 Inference Iterations Executed",
      targetTab: "deployments",
      durationSeconds: 10,
      startTimeSeconds: 20,
      description:
        "Trigger the automated hardware verification suite. EdgeForge launches the bundle in a sandbox, validates zero-copy host-to-device pinned memory transfers, and checks output tensors.",
      keyTakeaway:
        "Zero-copy DMA transfers eliminate CPU-to-GPU memory copies, saving up to 1.8 ms per frame.",
      actionCallout: "Executing automated bundle smoke test: verifying pinned memory buffers.",
      snapshot: {
        ...baseSnapshot,
        deploymentsTab: {
          ...baseSnapshot.deploymentsTab!,
          isVerifying: true,
          verificationResult: null,
        },
      },
      steps: [
        {
          id: "step-deploy-ver-1",
          stepNumber: 3,
          offsetSeconds: 0,
          label: "Launch Smoke Test",
          description: "Testing model execution and DMA transfer in target runtime container.",
          actionType: "verify_bundle",
          actionCallout: "Running verification loop.",
        },
      ],
    },
    {
      id: "stage-deploy-complete",
      stageNumber: 4,
      title: "Certification & Production Attestation",
      subtitle: "Return Code: 0 • Zero Errors • 10/10 Iterations Passed (4.12 ms Median)",
      targetTab: "deployments",
      durationSeconds: 10,
      startTimeSeconds: 30,
      description:
        "Verification complete. Zero errors, zero warnings. Output tensor dimensions (1, 84, 8400) confirmed. The package is production-certified and ready for edge deployment.",
      keyTakeaway:
        "Guaranteed deployment reliability before field dispatch: eliminate runtime crashes and driver mismatches.",
      actionCallout: "Verification PASSED. Bundle certified production-ready.",
      snapshot: {
        ...baseSnapshot,
        deploymentsTab: {
          ...baseSnapshot.deploymentsTab!,
          isVerifying: false,
          verificationResult: REPLAY_VERIFICATION_RESULT,
        },
      },
      steps: [
        {
          id: "step-deploy-com-1",
          stepNumber: 4,
          offsetSeconds: 0,
          label: "Confirm Certification",
          description: "Zero-copy verification confirmed with returncode 0.",
          actionType: "state_patch",
          actionCallout: "Production certification confirmed.",
        },
      ],
    },
  ],
  finalSummary: {
    headline: "Deployment Packaging & Smoke Test Verified",
    achievements: [
      "Generated portable standalone deployment ZIP (145 KB)",
      "Validated SHA-256 cryptographic manifest digests across all 6 files",
      "Executed automated hardware verification with zero-copy DMA memory",
      "Achieved 10/10 successful inference iterations (4.12 ms median) with returncode 0",
    ],
    metricsAchieved: {
      latency: "4.12 ms verified",
      fps: "242.7 FPS",
      compression: "3.81x INT8",
      power: "11.8 W",
      accuracy: "0.852 mAP@50",
    },
    suggestedNextScenarios: ["featured-end-to-end", "yolo-inspection"],
  },
};
