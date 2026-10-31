from typing import Any, Dict, List, Optional, Tuple
from backend.app.schemas import CandidateScore, ConstraintInput, RecommendationResponse

class RecommendationEngine:
    @staticmethod
    def evaluate_candidate(
        run: Dict[str, Any],
        device: Dict[str, Any],
        constraints: ConstraintInput,
        baseline_map50: Optional[float] = None
    ) -> CandidateScore:
        latency_ms = float(run.get("median_latency_ms", 9999.0))
        fps = float(run.get("fps", 0.0))
        memory_mb = float(run.get("memory_rss_mb", 0.0))
        measured_power_w = run.get("avg_power_watts")
        device_tdp_w = device.get("tdp_watts")
        cost_usd = device.get("cost_usd")
        map50 = run.get("map50")
        
        # Calculate accuracy loss relative to baseline if available on matching dataset
        accuracy_loss_pct = None
        if baseline_map50 and baseline_map50 > 0 and map50 is not None:
            accuracy_loss_pct = max(0.0, ((baseline_map50 - map50) / baseline_map50) * 100.0)

        violations: List[str] = []
        unknowns: List[str] = []

        # Check hard constraints
        if constraints.max_latency_ms is not None:
            if latency_ms > constraints.max_latency_ms:
                violations.append(f"Latency {latency_ms:.1f}ms exceeds limit {constraints.max_latency_ms:.1f}ms")

        if constraints.min_fps is not None:
            if fps < constraints.min_fps:
                violations.append(f"Throughput {fps:.1f} FPS is below required {constraints.min_fps:.1f} FPS")

        if constraints.max_memory_mb is not None:
            if memory_mb > constraints.max_memory_mb:
                violations.append(f"Memory footprint {memory_mb:.1f}MB exceeds limit {constraints.max_memory_mb:.1f}MB")

        if constraints.max_power_w is not None:
            if measured_power_w is None:
                violations.append(f"Power consumption not measured on hardware; cannot confirm <= {constraints.max_power_w:.1f}W hard constraint")
                unknowns.append("Power telemetry not measured on device")
            elif measured_power_w > constraints.max_power_w:
                violations.append(f"Measured power consumption {measured_power_w:.1f}W exceeds limit {constraints.max_power_w:.1f}W")
        elif measured_power_w is None:
            unknowns.append("Power telemetry not measured on device")

        if constraints.max_cost_usd is not None:
            if cost_usd is not None and cost_usd > constraints.max_cost_usd:
                violations.append(f"Device cost ${cost_usd:.0f} exceeds budget ${constraints.max_cost_usd:.0f}")

        if constraints.max_accuracy_loss_pct is not None:
            if accuracy_loss_pct is None:
                violations.append(f"Accuracy regression unverified on dataset; cannot satisfy hard limit <= {constraints.max_accuracy_loss_pct:.1f}%")
                unknowns.append("Accuracy regression not verified against validation dataset")
            elif accuracy_loss_pct > constraints.max_accuracy_loss_pct:
                violations.append(f"Accuracy loss {accuracy_loss_pct:.1f}% exceeds threshold {constraints.max_accuracy_loss_pct:.1f}%")
        elif accuracy_loss_pct is None and map50 is None:
            unknowns.append("Accuracy not evaluated on validation dataset")

        if constraints.required_device_type is not None:
            if device.get("device_type", "").lower() != constraints.required_device_type.lower():
                violations.append(f"Device type '{device.get('device_type')}' != required '{constraints.required_device_type}'")

        # Multi-factor score computation (higher is better, 0-100 scale)
        # Weights adapt based on optimization_preference
        pref = (constraints.optimization_preference or "balanced").lower()
        if pref == "latency":
            w_lat, w_fps, w_pwr, w_acc, w_cost = 0.45, 0.25, 0.10, 0.15, 0.05
        elif pref == "accuracy":
            w_lat, w_fps, w_pwr, w_acc, w_cost = 0.15, 0.10, 0.10, 0.55, 0.10
        elif pref == "power":
            w_lat, w_fps, w_pwr, w_acc, w_cost = 0.15, 0.10, 0.45, 0.15, 0.15
        else:  # balanced
            w_lat, w_fps, w_pwr, w_acc, w_cost = 0.25, 0.20, 0.20, 0.20, 0.15

        # Normalization factors
        norm_lat = max(0.0, 100.0 - min(100.0, latency_ms))
        norm_fps = min(100.0, fps * 1.5)
        norm_pwr = max(0.0, 100.0 - (measured_power_w if measured_power_w is not None else (device_tdp_w or 50.0)))
        norm_acc = (map50 * 100.0) if map50 is not None else 75.0
        norm_cost = max(0.0, 100.0 - ((cost_usd or 500.0) / 20.0))

        score = round(
            w_lat * norm_lat +
            w_fps * norm_fps +
            w_pwr * norm_pwr +
            w_acc * norm_acc +
            w_cost * norm_cost,
            2
        )

        return CandidateScore(
            hardware_id=device.get("id", ""),
            hardware_name=device.get("name", ""),
            run_id=run.get("id", ""),
            precision=run.get("precision", "fp32"),
            runtime=run.get("runtime", "onnxruntime"),
            latency_ms=round(latency_ms, 2),
            fps=round(fps, 1),
            memory_mb=round(memory_mb, 1),
            power_w=round(measured_power_w, 1) if measured_power_w is not None else None,
            map50=round(map50, 4) if map50 is not None else None,
            accuracy_loss_pct=round(accuracy_loss_pct, 2) if accuracy_loss_pct is not None else None,
            cost_usd=cost_usd,
            score=score,
            is_pareto_optimal=False,
            violations=violations,
            unknowns=unknowns
        )

    @classmethod
    def compute_pareto_frontier(
        cls, candidates: List[CandidateScore]
    ) -> List[CandidateScore]:
        """
        Determines Pareto optimality across (Latency [min], FPS [max], Power [min], Accuracy [max]).
        """
        pareto: List[CandidateScore] = []
        for a in candidates:
            is_dominated = False
            for b in candidates:
                if a == b:
                    continue
                # B dominates A if B is better or equal in all objectives and strictly better in at least one
                b_lat = b.latency_ms <= a.latency_ms
                b_fps = b.fps >= a.fps
                b_pwr = (b.power_w or 50) <= (a.power_w or 50)
                b_acc = (b.map50 or 0) >= (a.map50 or 0)

                b_strictly_better = (
                    b.latency_ms < a.latency_ms or
                    b.fps > a.fps or
                    (b.power_w or 50) < (a.power_w or 50) or
                    (b.map50 or 0) > (a.map50 or 0)
                )

                if b_lat and b_fps and b_pwr and b_acc and b_strictly_better:
                    is_dominated = True
                    break

            if not is_dominated:
                a.is_pareto_optimal = True
                pareto.append(a)
            else:
                a.is_pareto_optimal = False

        return pareto

    @classmethod
    def rank_and_recommend(
        cls,
        runs_with_devices: List[Tuple[Dict[str, Any], Dict[str, Any]]],
        constraints: ConstraintInput,
        objective: str
    ) -> Dict[str, Any]:
        """
        Evaluates, eliminates violations, calculates Pareto frontier, and selects winner.
        """
        # Index baseline FP32 accuracy per dataset_id
        baselines_by_dataset: Dict[Optional[str], float] = {}
        for r, _ in runs_with_devices:
            d_id = r.get("dataset_id")
            if r.get("precision") == "fp32" and r.get("map50") is not None and d_id not in baselines_by_dataset:
                baselines_by_dataset[d_id] = r.get("map50")

        feasible: List[CandidateScore] = []
        violated: List[CandidateScore] = []

        for r, d in runs_with_devices:
            b_map = baselines_by_dataset.get(r.get("dataset_id"))
            cand = cls.evaluate_candidate(r, d, constraints, baseline_map50=b_map)
            if cand.violations:
                violated.append(cand)
            else:
                feasible.append(cand)

        # Sort feasible by score descending
        feasible.sort(key=lambda x: x.score, reverse=True)
        pareto = cls.compute_pareto_frontier(feasible)

        winner = feasible[0] if feasible else None

        # Build justification
        if winner:
            justification = (
                f"Configuration on {winner.hardware_name} ({winner.runtime}, {winner.precision.upper()}) "
                f"was verified as the optimal deployment choice. It achieved {winner.latency_ms:.1f}ms median latency "
                f"({winner.fps:.1f} FPS) with memory footprint {winner.memory_mb:.1f}MB, satisfying all specified constraints. "
                f"Score: {winner.score:.1f}/100."
            )
        else:
            justification = (
                "No evaluated configuration met all hard constraints. Review violated constraints "
                "or consider applying INT8 quantization to reduce latency and memory footprint."
            )

        return {
            "winner": winner,
            "pareto_candidates": pareto,
            "violated_candidates": violated,
            "justification": justification
        }
