import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.models.entities import (
    AgentSession, AgentTrace, ModelRecord, DatasetRecord, HardwareDevice,
    Experiment, BenchmarkRun, Recommendation
)
from backend.app.schemas import ConstraintInput
from backend.app.services.onnx_inspector import inspect_onnx_file
from backend.app.services.hardware_detector import detect_all_hardware
from backend.app.services.benchmark_engine import BenchmarkEngine
from backend.app.services.optimizer import optimize_onnx_model
from backend.app.services.recommendation_engine import RecommendationEngine
from backend.app.services.exporter import export_deployment_bundle
from backend.app.services.meta_provider import meta_provider
from backend.app.services.compatibility_service import CompatibilityEngine

class AgentToolRegistry:
    @staticmethod
    def get_tool_definitions() -> List[Dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "inspect_model",
                    "description": "Inspects an ONNX model file: inputs, outputs, opset version, operator counts, and sha256 checksum.",
                    "parameters": {
                        "type": "object",
                        "properties": {"model_id": {"type": "string"}},
                        "required": ["model_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "inspect_onnx_graph",
                    "description": "Deeply inspects the ONNX computational graph, node sequence, and tensor dimensions.",
                    "parameters": {
                        "type": "object",
                        "properties": {"model_id": {"type": "string"}},
                        "required": ["model_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "inspect_dataset",
                    "description": "Inspects validation dataset images, label annotations, and class distributions.",
                    "parameters": {
                        "type": "object",
                        "properties": {"dataset_id": {"type": "string"}},
                        "required": ["dataset_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "list_hardware",
                    "description": "Lists all connected and registered edge hardware devices with active connectivity and telemetry status.",
                    "parameters": {"type": "object", "properties": {}}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "check_runtime_capabilities",
                    "description": "Checks execution providers, precisions, and telemetry support for a specific hardware device.",
                    "parameters": {
                        "type": "object",
                        "properties": {"device_id": {"type": "string"}},
                        "required": ["device_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "check_model_compatibility",
                    "description": "Validates operator and precision compatibility of a model against a target runtime and hardware.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "model_id": {"type": "string"},
                            "device_id": {"type": "string"},
                            "runtime": {"type": "string"}
                        },
                        "required": ["model_id", "device_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "list_existing_benchmarks",
                    "description": "Retrieves verified benchmark runs and historical performance metrics for a model.",
                    "parameters": {
                        "type": "object",
                        "properties": {"model_id": {"type": "string"}},
                        "required": ["model_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_experiment",
                    "description": "Creates a benchmark experiment job for a given model, hardware, runtime, and precision.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "model_id": {"type": "string"},
                            "hardware_id": {"type": "string"},
                            "dataset_id": {"type": "string"},
                            "precision": {"type": "string", "enum": ["fp32", "fp16", "int8"]},
                            "runtime": {"type": "string"},
                            "iterations": {"type": "integer"}
                        },
                        "required": ["model_id", "hardware_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "run_benchmark",
                    "description": "Executes a benchmark experiment on real or simulated hardware and computes latency statistics.",
                    "parameters": {
                        "type": "object",
                        "properties": {"experiment_id": {"type": "string"}},
                        "required": ["experiment_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_experiment_status",
                    "description": "Checks the execution progress, status, and logs of an experiment.",
                    "parameters": {
                        "type": "object",
                        "properties": {"experiment_id": {"type": "string"}},
                        "required": ["experiment_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "inspect_compiler_errors",
                    "description": "Diagnoses compilation or runtime errors encountered during execution.",
                    "parameters": {
                        "type": "object",
                        "properties": {"experiment_id": {"type": "string"}},
                        "required": ["experiment_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "analyze_quantization",
                    "description": "Applies INT8 quantization or FP16 conversion and measures model compression ratio.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "model_id": {"type": "string"},
                            "optimization_type": {"type": "string", "enum": ["int8_dynamic", "int8_static", "fp16", "graph_opt"]}
                        },
                        "required": ["model_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "compare_runs",
                    "description": "Performs side-by-side metric comparison across benchmark runs.",
                    "parameters": {
                        "type": "object",
                        "properties": {"run_ids": {"type": "array", "items": {"type": "string"}}},
                        "required": ["run_ids"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "evaluate_constraints",
                    "description": "Evaluates candidate benchmark runs against latency, accuracy, power, and cost constraints.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "model_id": {"type": "string"},
                            "constraints": {"type": "object"}
                        },
                        "required": ["model_id", "constraints"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "recommend_hardware",
                    "description": "Selects the optimal deployment target and Pareto-frontier candidates.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "model_id": {"type": "string"},
                            "objective": {"type": "string"},
                            "constraints": {"type": "object"}
                        },
                        "required": ["model_id", "objective"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "generate_report",
                    "description": "Generates a structured deployment and benchmarking report.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "model_id": {"type": "string"},
                            "run_ids": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["model_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "export_deployment_package",
                    "description": "Packages the verified model, runtime config, and standalone Python runner into a deployment ZIP.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "model_id": {"type": "string"},
                            "run_id": {"type": "string"}
                        },
                        "required": ["model_id", "run_id"]
                    }
                }
            }
        ]

    @classmethod
    async def execute_tool(
        cls, db: AsyncSession, tool_name: str, args: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes a tool with strict safety checks and returns structured JSON output.
        """
        ALIAS_MAP = {
            "get_model_metadata": "inspect_model",
            "list_available_hardware": "list_hardware",
            "get_runtime_capabilities": "check_runtime_capabilities",
            "get_compatibility_report": "check_model_compatibility",
            "get_dataset_metadata": "inspect_dataset",
            "create_benchmark_experiment": "create_experiment",
            "compare_experiments": "compare_runs",
            "evaluate_deployment_constraints": "evaluate_constraints",
            "get_compilation_errors": "inspect_compiler_errors",
            "propose_optimization": "analyze_quantization",
            "generate_deployment_report": "generate_report"
        }
        tool_name = ALIAS_MAP.get(tool_name, tool_name)

        if tool_name == "inspect_model":
            model_id = args.get("model_id")
            stmt = select(ModelRecord).where(ModelRecord.id == model_id)
            res = await db.execute(stmt)
            model = res.scalar_one_or_none()
            if not model:
                return {"error": f"Model {model_id} not found"}
            return {
                "id": model.id,
                "name": model.name,
                "sha256": model.sha256,
                "opset_version": model.opset_version,
                "input_shapes": model.input_shapes,
                "output_shapes": model.output_shapes,
                "node_count": model.node_count,
                "operator_sample": dict(list((model.operators or {}).items())[:10])
            }

        elif tool_name == "inspect_onnx_graph":
            model_id = args.get("model_id")
            stmt = select(ModelRecord).where(ModelRecord.id == model_id)
            res = await db.execute(stmt)
            model = res.scalar_one_or_none()
            if not model:
                return {"error": f"Model {model_id} not found"}
            info = inspect_onnx_file(Path(model.filepath))
            return {
                "node_count": info["node_count"],
                "operators": info["operators"],
                "opset": info["opset_version"],
                "is_valid": info["is_valid"]
            }

        elif tool_name == "list_hardware":
            stmt = select(HardwareDevice)
            res = await db.execute(stmt)
            devices = res.scalars().all()
            return {
                "devices": [
                    {
                        "id": d.id,
                        "name": d.name,
                        "type": d.device_type,
                        "status": d.status,
                        "is_local": d.is_local,
                        "compute_tops": d.compute_tops,
                        "memory_mb": d.memory_mb,
                        "tdp_watts": d.tdp_watts,
                        "cost_usd": d.cost_usd,
                        "supported_runtimes": d.supported_runtimes
                    }
                    for d in devices
                ]
            }

        elif tool_name == "check_runtime_capabilities":
            dev_id = args.get("device_id")
            stmt = select(HardwareDevice).where(HardwareDevice.id == dev_id)
            res = await db.execute(stmt)
            dev = res.scalar_one_or_none()
            if not dev:
                return {"error": f"Device {dev_id} not found"}
            return {
                "device_id": dev.id,
                "name": dev.name,
                "status": dev.status,
                "supported_runtimes": dev.supported_runtimes,
                "supported_precisions": dev.supported_precisions,
                "telemetry_supported": dev.telemetry_supported
            }

        elif tool_name == "inspect_dataset":
            dataset_id = args.get("dataset_id")
            stmt = select(DatasetRecord).where(DatasetRecord.id == dataset_id)
            res = await db.execute(stmt)
            ds = res.scalar_one_or_none()
            if not ds:
                return {"error": f"Dataset {dataset_id} not found"}
            return {
                "id": ds.id,
                "name": ds.name,
                "format": ds.format,
                "task_type": ds.task_type,
                "num_samples": ds.num_samples,
                "classes": ds.classes,
                "annotations_path": ds.annotations_path,
                "metadata": ds.metadata_json
            }

        elif tool_name == "check_model_compatibility":
            model_id = args.get("model_id")
            dev_id = args.get("device_id") or args.get("target_id")
            runtime = args.get("runtime", "onnxruntime")
            precision = args.get("precision", "fp32")
            
            stmt_m = select(ModelRecord).where(ModelRecord.id == model_id)
            res_m = await db.execute(stmt_m)
            model = res_m.scalar_one_or_none()

            stmt_d = select(HardwareDevice).where(HardwareDevice.id == dev_id)
            res_d = await db.execute(stmt_d)
            dev = res_d.scalar_one_or_none()

            if not model or not dev:
                return {"error": "Model or device not found"}

            model_info = {
                "id": model.id,
                "name": model.name,
                "opset_version": model.opset_version,
                "operators": model.operators,
                "input_shapes": model.input_shapes,
                "output_shapes": model.output_shapes,
            }
            dev_info = {
                "id": dev.id,
                "name": dev.name,
                "device_type": dev.device_type,
                "status": dev.status,
                "is_local": dev.is_local,
                "supported_runtimes": dev.supported_runtimes,
                "supported_precisions": dev.supported_precisions,
            }

            return CompatibilityEngine.check_compatibility(
                model_info=model_info,
                device_info=dev_info,
                runtime=runtime,
                precision=precision
            )

        elif tool_name == "get_benchmark_results":
            exp_id = args.get("experiment_id")
            stmt = select(BenchmarkRun).where(BenchmarkRun.experiment_id == exp_id)
            res = await db.execute(stmt)
            run = res.scalar_one_or_none()
            if not run:
                return {"error": f"No benchmark run found for experiment {exp_id}"}
            return {
                "run_id": run.id,
                "experiment_id": run.experiment_id,
                "hardware_id": run.hardware_id,
                "precision": run.precision,
                "median_latency_ms": run.median_latency_ms,
                "fps": run.fps,
                "p95_latency_ms": run.p95_latency_ms,
                "memory_rss_mb": run.memory_rss_mb,
                "avg_power_watts": run.avg_power_watts,
                "map50": run.map50,
                "reproducibility": run.reproducibility_json
            }

        elif tool_name == "list_existing_benchmarks":
            model_id = args.get("model_id")
            stmt = select(BenchmarkRun).where(BenchmarkRun.model_id == model_id)
            res = await db.execute(stmt)
            runs = res.scalars().all()
            return {
                "runs_count": len(runs),
                "runs": [
                    {
                        "id": r.id,
                        "hardware_id": r.hardware_id,
                        "runtime": r.runtime,
                        "precision": r.precision,
                        "median_latency_ms": r.median_latency_ms,
                        "fps": r.fps,
                        "memory_rss_mb": r.memory_rss_mb,
                        "power_watts": r.avg_power_watts,
                        "map50": r.map50
                    }
                    for r in runs
                ]
            }

        elif tool_name == "create_experiment":
            exp = Experiment(
                name=f"Experiment-{args.get('precision', 'fp32').upper()}-{args.get('hardware_id')}",
                model_id=args["model_id"],
                dataset_id=args.get("dataset_id"),
                hardware_id=args["hardware_id"],
                runtime=args.get("runtime", "onnxruntime"),
                execution_provider="CUDAExecutionProvider" if "gpu" in args["hardware_id"] else "CPUExecutionProvider",
                precision=args.get("precision", "fp32"),
                batch_size=args.get("batch_size", 1),
                iterations=args.get("iterations", 30),
                warmup_iterations=5,
                status="QUEUED"
            )
            db.add(exp)
            await db.commit()
            await db.refresh(exp)
            return {"experiment_id": exp.id, "status": exp.status}

        elif tool_name == "run_benchmark":
            exp_id = args.get("experiment_id")
            stmt = select(Experiment).where(Experiment.id == exp_id)
            res = await db.execute(stmt)
            exp = res.scalar_one_or_none()
            if not exp:
                return {"error": f"Experiment {exp_id} not found"}

            stmt_m = select(ModelRecord).where(ModelRecord.id == exp.model_id)
            res_m = await db.execute(stmt_m)
            model = res_m.scalar_one_or_none()
            if not model:
                return {"error": f"Model {exp.model_id} not found"}

            stmt_h = select(HardwareDevice).where(HardwareDevice.id == exp.hardware_id)
            res_h = await db.execute(stmt_h)
            hw = res_h.scalar_one_or_none()
            if hw and not hw.is_local:
                return {
                    "error": f"Cannot execute physical benchmark: Hardware '{hw.name}' is not locally connected (Status: {hw.status}). Real hardware measurements require an authenticated on-device worker."
                }

            exp.status = "RUNNING"
            exp.started_at = datetime.utcnow()
            await db.commit()

            # Execute real benchmark
            model_path = Path(model.filepath)
            # Check if quantized variant exists if precision == int8
            if exp.precision == "int8":
                quant_path = settings.STORAGE_DIR / "models" / f"{model.id}_int8.onnx"
                if not quant_path.exists():
                    optimize_onnx_model(model_path, quant_path, "int8_dynamic")
                model_path = quant_path

            results = BenchmarkEngine.run_benchmark(
                model_path=model_path,
                hardware_id=exp.hardware_id,
                execution_provider=exp.execution_provider,
                precision=exp.precision,
                batch_size=exp.batch_size,
                iterations=exp.iterations,
                warmup_iterations=exp.warmup_iterations
            )

            # Record run
            run = BenchmarkRun(
                experiment_id=exp.id,
                model_id=exp.model_id,
                hardware_id=exp.hardware_id,
                runtime=exp.runtime,
                precision=exp.precision,
                batch_size=exp.batch_size,
                latency_samples_ms=results["latency_samples_ms"],
                median_latency_ms=results["median_latency_ms"],
                mean_latency_ms=results["mean_latency_ms"],
                p90_latency_ms=results["p90_latency_ms"],
                p95_latency_ms=results["p95_latency_ms"],
                p99_latency_ms=results["p99_latency_ms"],
                std_latency_ms=results["std_latency_ms"],
                fps=results["fps"],
                memory_rss_mb=results["memory_rss_mb"],
                gpu_memory_used_mb=results["gpu_memory_used_mb"],
                avg_power_watts=results["avg_power_watts"],
                peak_power_watts=results["peak_power_watts"],
                avg_temperature_c=results["avg_temperature_c"],
                map50=results.get("map50"),
                map50_95=results.get("map50_95"),
                model_size_mb=results["model_size_mb"],
                reproducibility_metadata=results["reproducibility_metadata"]
            )
            db.add(run)
            exp.status = "COMPLETED"
            exp.progress = 100.0
            exp.completed_at = datetime.utcnow()
            await db.commit()
            await db.refresh(run)

            return {
                "run_id": run.id,
                "median_latency_ms": run.median_latency_ms,
                "fps": run.fps,
                "memory_mb": run.memory_rss_mb,
                "status": "COMPLETED"
            }

        elif tool_name == "get_experiment_status":
            exp_id = args.get("experiment_id")
            stmt = select(Experiment).where(Experiment.id == exp_id)
            res = await db.execute(stmt)
            exp = res.scalar_one_or_none()
            if not exp:
                return {"error": f"Experiment {exp_id} not found"}
            return {
                "experiment_id": exp.id,
                "status": exp.status,
                "progress": exp.progress,
                "error_message": exp.error_message,
                "started_at": exp.started_at.isoformat() if exp.started_at else None,
                "completed_at": exp.completed_at.isoformat() if exp.completed_at else None,
                "logs_tail": exp.logs[-500:] if exp.logs else ""
            }

        elif tool_name == "inspect_compiler_errors":
            exp_id = args.get("experiment_id")
            stmt = select(Experiment).where(Experiment.id == exp_id)
            res = await db.execute(stmt)
            exp = res.scalar_one_or_none()
            if not exp:
                return {"error": f"Experiment {exp_id} not found"}
            return {
                "experiment_id": exp.id,
                "status": exp.status,
                "error_message": exp.error_message,
                "compilation_diagnostics": exp.logs if exp.error_message else f"No compilation or runtime errors recorded. Status: {exp.status}"
            }

        elif tool_name == "analyze_quantization":
            model_id = args.get("model_id")
            opt_type = args.get("optimization_type", "int8_dynamic")
            stmt = select(ModelRecord).where(ModelRecord.id == model_id)
            res = await db.execute(stmt)
            model = res.scalar_one_or_none()
            if not model:
                return {"error": f"Model {model_id} not found"}

            out_path = settings.STORAGE_DIR / "models" / f"{model.id}_{opt_type}.onnx"
            opt_res = optimize_onnx_model(Path(model.filepath), out_path, opt_type)
            return opt_res

        elif tool_name == "compare_runs":
            run_ids = args.get("run_ids", [])
            stmt = select(BenchmarkRun).where(BenchmarkRun.id.in_(run_ids))
            res = await db.execute(stmt)
            runs = res.scalars().all()
            return {
                "comparison": [
                    {
                        "run_id": r.id,
                        "hardware_id": r.hardware_id,
                        "precision": r.precision,
                        "median_latency_ms": r.median_latency_ms,
                        "fps": r.fps,
                        "p95_latency_ms": r.p95_latency_ms,
                        "memory_mb": r.memory_rss_mb,
                        "power_w": r.avg_power_watts,
                        "map50": r.map50
                    }
                    for r in runs
                ]
            }

        elif tool_name == "evaluate_constraints" or tool_name == "recommend_hardware":
            model_id = args.get("model_id")
            raw_constraints = args.get("constraints", {})
            constraints = ConstraintInput(**raw_constraints)
            objective = args.get("objective", "Find optimal edge deployment")

            # Fetch runs
            stmt_runs = select(BenchmarkRun).where(BenchmarkRun.model_id == model_id)
            res_runs = await db.execute(stmt_runs)
            runs = res_runs.scalars().all()

            # Fetch devices
            stmt_devs = select(HardwareDevice)
            res_devs = await db.execute(stmt_devs)
            dev_map = {d.id: d.__dict__ for d in res_devs.scalars().all()}

            runs_with_devices = [
                (r.__dict__, dev_map.get(r.hardware_id, {}))
                for r in runs
            ]

            rec = RecommendationEngine.rank_and_recommend(runs_with_devices, constraints, objective)
            winner_dict = rec["winner"].model_dump() if rec["winner"] else None
            
            # Persist recommendation
            db_rec = Recommendation(
                objective=objective,
                constraints_json=raw_constraints,
                winner_run_id=winner_dict["run_id"] if winner_dict else None,
                winner_hardware_id=winner_dict["hardware_id"] if winner_dict else None,
                pareto_candidates_json=[c.model_dump() for c in rec["pareto_candidates"]],
                violated_candidates_json=[c.model_dump() for c in rec["violated_candidates"]],
                agent_justification=rec["justification"]
            )
            db.add(db_rec)
            await db.commit()

            return {
                "winner": winner_dict,
                "pareto_candidates_count": len(rec["pareto_candidates"]),
                "violated_candidates_count": len(rec["violated_candidates"]),
                "justification": rec["justification"]
            }

        elif tool_name == "generate_report":
            model_id = args.get("model_id")
            run_ids = args.get("run_ids")
            stmt_m = select(ModelRecord).where(ModelRecord.id == model_id)
            res_m = await db.execute(stmt_m)
            model = res_m.scalar_one_or_none()
            if not model:
                return {"error": f"Model {model_id} not found"}

            stmt_r = select(BenchmarkRun).where(BenchmarkRun.model_id == model_id)
            if run_ids:
                stmt_r = stmt_r.where(BenchmarkRun.id.in_(run_ids))
            res_r = await db.execute(stmt_r)
            runs = res_r.scalars().all()

            stmt_hw = select(HardwareDevice)
            res_hw = await db.execute(stmt_hw)
            hw_map = {h.id: h.name for h in res_hw.scalars().all()}

            return {
                "model_id": model.id,
                "model_name": model.name,
                "sha256": model.sha256,
                "opset_version": model.opset_version,
                "total_runs_evaluated": len(runs),
                "configurations": [
                    {
                        "run_id": r.id,
                        "hardware_id": r.hardware_id,
                        "hardware_name": hw_map.get(r.hardware_id, r.hardware_id),
                        "runtime": r.runtime,
                        "precision": r.precision,
                        "median_latency_ms": r.median_latency_ms,
                        "fps": r.fps,
                        "memory_mb": r.memory_rss_mb,
                        "map50": r.map50,
                        "verified": r.verified
                    }
                    for r in runs
                ]
            }

        elif tool_name == "export_deployment_package":
            model_id = args.get("model_id")
            run_id = args.get("run_id")
            
            stmt_m = select(ModelRecord).where(ModelRecord.id == model_id)
            res_m = await db.execute(stmt_m)
            model = res_m.scalar_one_or_none()

            stmt_r = select(BenchmarkRun).where(BenchmarkRun.id == run_id)
            res_r = await db.execute(stmt_r)
            run = res_r.scalar_one_or_none()

            if not model or not run:
                return {"error": "Model or Run not found"}

            stmt_d = select(HardwareDevice).where(HardwareDevice.id == run.hardware_id)
            res_d = await db.execute(stmt_d)
            device = res_d.scalar_one_or_none()
            dev_dict = device.__dict__ if device else {"name": "Generic Hardware", "device_type": "cpu"}

            bundle_info = export_deployment_bundle(
                bundle_id=f"deploy-{model.name}-{run.precision}-{str(uuid.uuid4())[:8]}",
                model_record=model.__dict__,
                run_record=run.__dict__,
                device_record=dev_dict
            )
            return bundle_info

        return {"error": f"Unknown tool: {tool_name}"}

class AgentOrchestrator:
    """
    Coordinates Meta AI Deployment Engineer reasoning, tool invocation,
    and multi-accelerator execution.
    """

    @classmethod
    async def process_user_query(
        cls,
        db: AsyncSession,
        session_id: Optional[str],
        user_message: str,
        model_id: Optional[str] = None,
        constraints: Optional[ConstraintInput] = None
    ) -> Dict[str, Any]:
        if not session_id:
            session = AgentSession(
                title=user_message[:50],
                mode="META_MUSE_SPARK"
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)
            session_id = session.id
        else:
            stmt = select(AgentSession).where(AgentSession.id == session_id)
            res = await db.execute(stmt)
            session = res.scalar_one_or_none()
            if session:
                session.mode = "META_MUSE_SPARK"

        traces: List[Dict[str, Any]] = []
        step_number = 1
        t1_res: Dict[str, Any] = {}
        t2_res: Dict[str, Any] = {}
        t3_res: Dict[str, Any] = {}
        t5_res: Dict[str, Any] = {}
        cons_dict: Dict[str, Any] = constraints.model_dump() if constraints else {"max_latency_ms": 30.0}

        # Systematic Senior Edge AI Engineer Workflow:
        # Step 1: Model Inspection
        if model_id:
            t1_args = {"model_id": model_id}
            t1_res = await AgentToolRegistry.execute_tool(db, "inspect_model", t1_args)
            trace1 = AgentTrace(
                session_id=session_id,
                step_number=step_number,
                role="assistant",
                thought="Inspecting model architecture, input dimensions, and operator graph to verify compatibility.",
                tool_name="inspect_model",
                tool_args_json=t1_args,
                tool_result_json=t1_res,
                content="Inspected model graph.",
                status="SUCCESS"
            )
            db.add(trace1)
            traces.append(trace1.__dict__)
            step_number += 1

        # Step 2: List available hardware
        t2_res = await AgentToolRegistry.execute_tool(db, "list_hardware", {})
        trace2 = AgentTrace(
            session_id=session_id,
            step_number=step_number,
            role="assistant",
            thought="Querying hardware registry to discover online accelerators and target edge profiles.",
            tool_name="list_hardware",
            tool_args_json={},
            tool_result_json=t2_res,
            content="Hardware registry queried.",
            status="SUCCESS"
        )
        db.add(trace2)
        traces.append(trace2.__dict__)
        step_number += 1

        # Step 3: Check existing benchmarks
        if model_id:
            t3_args = {"model_id": model_id}
            t3_res = await AgentToolRegistry.execute_tool(db, "list_existing_benchmarks", t3_args)
            trace3 = AgentTrace(
                session_id=session_id,
                step_number=step_number,
                role="assistant",
                thought="Checking existing verified benchmark runs to prevent redundant compute.",
                tool_name="list_existing_benchmarks",
                tool_args_json=t3_args,
                tool_result_json=t3_res,
                content="Retrieved historical benchmark runs.",
                status="SUCCESS"
            )
            db.add(trace3)
            traces.append(trace3.__dict__)
            step_number += 1

            # If no benchmarks exist, automatically create & run baseline on local CPU
            if t3_res.get("runs_count", 0) == 0:
                t4_args = {
                    "model_id": model_id,
                    "hardware_id": "cpu-local",
                    "runtime": "onnxruntime",
                    "precision": "fp32",
                    "iterations": 25
                }
                t4_res = await AgentToolRegistry.execute_tool(db, "create_experiment", t4_args)
                exp_id = t4_res.get("experiment_id")
                await AgentToolRegistry.execute_tool(db, "run_benchmark", {"experiment_id": exp_id})

            # Step 4: Evaluate constraints & recommend
            t5_args = {
                "model_id": model_id,
                "objective": user_message,
                "constraints": cons_dict
            }
            t5_res = await AgentToolRegistry.execute_tool(db, "recommend_hardware", t5_args)
            trace5 = AgentTrace(
                session_id=session_id,
                step_number=step_number,
                role="assistant",
                thought="Evaluating Pareto frontier trade-offs and selecting optimal deployment configuration.",
                tool_name="recommend_hardware",
                tool_args_json=t5_args,
                tool_result_json=t5_res,
                content="Completed multi-objective constraint evaluation.",
                status="SUCCESS"
            )
            db.add(trace5)
            traces.append(trace5.__dict__)

        await db.commit()

        # Build natural language deployment decision grounded in evidence
        reply = await meta_provider.generate_deployment_report(
            user_message=user_message,
            model_info=t1_res if model_id else None,
            hardware_list=t2_res.get("devices") if isinstance(t2_res, dict) else None,
            benchmarks=t3_res.get("runs") if (model_id and isinstance(t3_res, dict)) else None,
            recommendation=t5_res if (model_id and isinstance(t5_res, dict)) else None,
            constraints=cons_dict if model_id else None
        )

        return {
            "session_id": session_id,
            "title": session.title,
            "mode": session.mode,
            "reply": reply,
            "traces": [
                {
                    "step_number": t.get("step_number") if isinstance(t, dict) else t.step_number,
                    "role": t.get("role") if isinstance(t, dict) else t.role,
                    "thought": t.get("thought") if isinstance(t, dict) else t.thought,
                    "tool_name": t.get("tool_name") if isinstance(t, dict) else t.tool_name,
                    "tool_args": t.get("tool_args_json") if isinstance(t, dict) else t.tool_args_json,
                    "tool_result": t.get("tool_result_json") if isinstance(t, dict) else t.tool_result_json,
                    "status": t.get("status") if isinstance(t, dict) else t.status,
                    "created_at": datetime.utcnow()
                }
                for t in traces
            ]
        }
