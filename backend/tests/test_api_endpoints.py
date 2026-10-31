import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.database import init_db

@pytest.mark.asyncio
async def test_full_api_workflow():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Health
        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "online"

        # 2. Hardware
        res_hw = await ac.get("/api/v1/hardware")
        assert res_hw.status_code == 200
        hw_list = res_hw.json()
        assert len(hw_list) >= 2
        cpu = next(h for h in hw_list if h["id"] == "cpu-local")
        assert cpu["status"] == "ONLINE"

        # 3. Models (seeded on startup or seed endpoint)
        res_m = await ac.post("/api/v1/models/seed-sample")
        assert res_m.status_code == 200
        model_data = res_m.json()
        model_id = model_data["id"]
        assert model_id is not None

        # 4. Datasets
        res_d = await ac.post("/api/v1/datasets/seed-sample")
        assert res_d.status_code == 200
        dataset_data = res_d.json()
        dataset_id = dataset_data["id"]

        # 5. Create and Run Experiment
        exp_payload = {
            "name": "Integration Test Experiment",
            "model_id": model_id,
            "dataset_id": dataset_id,
            "hardware_id": "cpu-local",
            "runtime": "onnxruntime",
            "execution_provider": "CPUExecutionProvider",
            "precision": "fp32",
            "batch_size": 1,
            "iterations": 10,
            "warmup_iterations": 2
        }
        res_exp = await ac.post("/api/v1/experiments", json=exp_payload)
        assert res_exp.status_code == 200
        exp_id = res_exp.json()["id"]

        # Run synchronously
        res_run = await ac.post(f"/api/v1/benchmarks/run/{exp_id}?sync=true")
        assert res_run.status_code == 200
        run_id = res_run.json()["run_id"]
        assert run_id is not None

        # 6. Check experiment details & run metrics
        res_exp_detail = await ac.get(f"/api/v1/experiments/{exp_id}")
        assert res_exp_detail.status_code == 200
        exp_detail = res_exp_detail.json()
        assert exp_detail["status"] == "COMPLETED"
        assert exp_detail["run"]["median_latency_ms"] > 0
        assert exp_detail["run"]["fps"] > 0

        # 7. Recommendations
        rec_payload = {
            "model_id": model_id,
            "objective": "Must achieve latency under 50ms and 20+ FPS",
            "constraints": {
                "max_latency_ms": 50.0,
                "min_fps": 15.0,
                "optimization_preference": "latency"
            }
        }
        res_rec = await ac.post("/api/v1/recommendations", json=rec_payload)
        assert res_rec.status_code == 200
        rec_data = res_rec.json()
        assert rec_data["winner"] is not None
        assert rec_data["winner"]["run_id"] is not None
        assert len(rec_data["pareto_candidates"]) >= 1

        # 8. Meta AI Agent
        agent_payload = {
            "message": "Optimize my YOLO model to run below 30 ms on local CPU",
            "model_id": model_id,
            "constraints": {"max_latency_ms": 30.0}
        }
        res_agent = await ac.post("/api/v1/agent/chat", json=agent_payload)
        assert res_agent.status_code == 200
        agent_res = res_agent.json()
        assert len(agent_res["traces"]) >= 3
        assert "EdgeForge Deployment Recommendation" in agent_res["reply"]

        # 9. Meta provider status
        res_meta_status = await ac.get("/api/v1/agent/meta-status")
        assert res_meta_status.status_code == 200
        meta_status = res_meta_status.json()
        assert "mode" in meta_status

        # 10. Deployment export & verification
        export_payload = {
            "model_id": model_id,
            "run_id": run_id
        }
        res_export = await ac.post("/api/v1/deployments/export", json=export_payload)
        assert res_export.status_code == 200
        bundle_id = res_export.json()["bundle_id"]

        # Verify exported package with smoke-test
        res_verify = await ac.post(f"/api/v1/deployments/verify/{bundle_id}")
        assert res_verify.status_code == 200
        verify_data = res_verify.json()
        assert verify_data["verification_status"] == "PASSED"
        assert "Benchmark complete" in verify_data["stdout"]
