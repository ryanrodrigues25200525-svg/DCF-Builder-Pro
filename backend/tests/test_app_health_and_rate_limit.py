from __future__ import annotations

from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app


def test_health_and_readiness_endpoints() -> None:
    client = TestClient(app)

    health = client.get("/health")
    ready = client.get("/ready")

    assert health.status_code == 200
    assert health.json()["status"] == "healthy"

    assert ready.status_code == 200
    payload = ready.json()
    assert payload["status"] == "ready"
    assert "cache" in payload


def test_rate_limit_headers_present_on_api_routes() -> None:
    client = TestClient(app)
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.headers.get("x-request-id")
    assert response.headers.get("x-response-time-ms")
