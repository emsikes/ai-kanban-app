from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_serves_board():
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "Kanban Studio" in response.text
