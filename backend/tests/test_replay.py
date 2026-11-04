import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_replay_status_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/replay/status")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ready"
        assert data["isolated"] is True
        assert data["requires_auth"] is False
        assert data["scenario_count"] >= 7

@pytest.mark.asyncio
async def test_replay_scenarios_listing():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/replay/scenarios")
        assert res.status_code == 200
        scenarios = res.json()
        assert len(scenarios) >= 7
        scenario_ids = [s["id"] for s in scenarios]
        assert "featured-e2e" in scenario_ids
        assert "yolo-inspection" in scenario_ids
        assert "hardware-benchmarking" in scenario_ids
        assert "precision-optimization" in scenario_ids
        assert "hardware-comparison" in scenario_ids
        assert "ai-engineer" in scenario_ids
        assert "deployment-bundling" in scenario_ids

@pytest.mark.asyncio
async def test_replay_scenario_detail():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/replay/scenarios/featured-e2e")
        assert res.status_code == 200
        scenario = res.json()
        assert scenario["id"] == "featured-e2e"
        assert len(scenario["stages"]) >= 7

        # 404 test for non-existent scenario
        res_404 = await ac.get("/api/v1/replay/scenarios/non-existent-scenario")
        assert res_404.status_code == 404
