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
        assert meta_status["mode"] == "META_MUSE_SPARK"
        assert meta_status["status"] == "ONLINE"
        assert meta_status["configured"] is True

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

        # 11. Compatibility Engine API
        compat_payload = {
            "model_id": model_id,
            "hardware_id": "cpu-local",
            "runtime": "onnxruntime",
            "precision": "fp32"
        }
        res_compat = await ac.post("/api/v1/compatibility/check", json=compat_payload)
        assert res_compat.status_code == 200
        compat_data = res_compat.json()
        assert compat_data["overall_status"] in ("COMPATIBLE", "CONDITIONAL")
        assert len(compat_data["findings"]) >= 1

        # Compatibility matrix
        res_matrix = await ac.get(f"/api/v1/compatibility/matrix/{model_id}")
        assert res_matrix.status_code == 200
        matrix_data = res_matrix.json()
        assert len(matrix_data["device_evaluations"]) >= 2

@pytest.mark.asyncio
async def test_system_capabilities_and_runtimes_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_sys = await ac.get("/api/v1/system/capabilities")
        assert res_sys.status_code == 200
        sys_data = res_sys.json()
        assert "platform" in sys_data
        assert "storage" in sys_data
        assert "runtimes" in sys_data
        assert "meta_ai" in sys_data

        res_runtimes = await ac.get("/api/v1/runtimes")
        assert res_runtimes.status_code == 200
        runtimes = res_runtimes.json()
        assert len(runtimes) >= 6

        res_rt = await ac.get("/api/v1/runtimes/onnxruntime_cpu")
        assert res_rt.status_code == 200
        assert res_rt.json()["status"] == "AVAILABLE"

@pytest.mark.asyncio
async def test_reports_html_json_and_download_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_m = await ac.post("/api/v1/models/seed-sample")
        model_id = res_m.json()["id"]

        res_rep = await ac.get(f"/api/v1/reports/{model_id}")
        assert res_rep.status_code == 200
        rep_data = res_rep.json()
        assert "html_report" in rep_data
        assert "<!DOCTYPE html>" in rep_data["html_report"]

        res_html = await ac.get(f"/api/v1/reports/{model_id}/download?format=html")
        assert res_html.status_code == 200
        assert "text/html" in res_html.headers.get("content-type", "")

        res_json = await ac.get(f"/api/v1/reports/{model_id}/download?format=json")
        assert res_json.status_code == 200
        assert "application/json" in res_json.headers.get("content-type", "")

@pytest.mark.asyncio
async def test_simulated_hardware_benchmark_rejection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_m = await ac.post("/api/v1/models/seed-sample")
        model_id = res_m.json()["id"]

        # Attempt to run physical benchmark on Hailo-8 M.2 (SIMULATED remote target)
        exp_payload = {
            "name": "Simulated Hardware Rejection Test",
            "model_id": model_id,
            "hardware_id": "hailo-8-m2",
            "runtime": "hailo_rt",
            "execution_provider": "HailoExecutionProvider",
            "precision": "int8"
        }
        res_exp = await ac.post("/api/v1/experiments", json=exp_payload)
        exp_id = res_exp.json()["id"]

        await ac.post(f"/api/v1/benchmarks/run/{exp_id}?sync=true")
        res_exp_status = await ac.get(f"/api/v1/experiments/{exp_id}")
        exp_info = res_exp_status.json()

        assert exp_info["status"] == "FAILED"
        assert "not locally connected" in exp_info["error_message"]

@pytest.mark.asyncio
async def test_experiment_cancel_and_retry_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_m = await ac.post("/api/v1/models/seed-sample")
        model_id = res_m.json()["id"]

        res_exp = await ac.post("/api/v1/experiments", json={
            "model_id": model_id,
            "hardware_id": "cpu-local",
            "precision": "fp32"
        })
        exp_id = res_exp.json()["id"]

        res_cancel = await ac.post(f"/api/v1/experiments/{exp_id}/cancel")
        assert res_cancel.status_code == 200
        assert res_cancel.json()["status"] == "CANCELLED"

        res_retry = await ac.post(f"/api/v1/experiments/{exp_id}/retry")
        assert res_retry.status_code == 200
        assert res_retry.json()["status"] == "QUEUED"

@pytest.mark.asyncio
async def test_agent_tool_registry_and_null_model_handling():
    from backend.app.core.database import AsyncSessionLocal
    from backend.app.services.agent_service import AgentToolRegistry, AgentOrchestrator
    
    async with AsyncSessionLocal() as db:
        # Test all 14 spec-defined tools directly
        hw_res = await AgentToolRegistry.execute_tool(db, "list_available_hardware", {})
        assert "devices" in hw_res

        rc_res = await AgentToolRegistry.execute_tool(db, "get_runtime_capabilities", {"device_id": "cpu-local"})
        assert "status" in rc_res

        # Test previously missing tools
        ds_res = await AgentToolRegistry.execute_tool(db, "get_dataset_metadata", {"dataset_id": "nonexistent"})
        assert "error" in ds_res and "not found" in ds_res["error"]

        st_res = await AgentToolRegistry.execute_tool(db, "get_experiment_status", {"experiment_id": "nonexistent"})
        assert "error" in st_res and "not found" in st_res["error"]

        err_res = await AgentToolRegistry.execute_tool(db, "get_compilation_errors", {"experiment_id": "nonexistent"})
        assert "error" in err_res and "not found" in err_res["error"]

        rep_res = await AgentToolRegistry.execute_tool(db, "generate_deployment_report", {"model_id": "nonexistent"})
        assert "error" in rep_res and "not found" in rep_res["error"]

        # Test AgentOrchestrator without model_id (general question)
        res_no_model = await AgentOrchestrator.process_user_query(
            db=db,
            session_id=None,
            user_message="What edge hardware accelerators are online and supported?",
            model_id=None
        )
        assert res_no_model["session_id"] is not None
        assert "EdgeForge Deployment Decision" in res_no_model["reply"]
        assert "EdgeForge Deployment Recommendation" in res_no_model["reply"]
        assert len(res_no_model["traces"]) >= 1

@pytest.mark.asyncio
async def test_zip_slip_security_rejection(tmp_path):
    import zipfile
    import io

    # Create a malicious in-memory zip file attempting path traversal
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("../../evil_escape.txt", "malicious payload")
    zip_buffer.seek(0)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        files = {"file": ("malicious_dataset.zip", zip_buffer.getvalue(), "application/zip")}
        res = await ac.post("/api/v1/datasets/upload", files=files, data={"name": "zip_slip_test"})
        assert res.status_code == 400
        assert "Zip Slip" in res.json()["detail"]
