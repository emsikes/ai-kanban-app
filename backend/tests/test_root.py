from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_serves_spa_shell():
    # The backend serves the built Next.js SPA shell. The board itself renders
    # client-side behind the auth gate, so it is asserted by the e2e suite, not
    # here. "_next/static" only appears in the real build, not the placeholder.
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "_next/static" in response.text
    assert "<title>Kanban Studio</title>" in response.text
