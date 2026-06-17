from fastapi.testclient import TestClient

from app.main import app


def test_session_unauthenticated_by_default():
    client = TestClient(app)
    response = client.get("/api/session")
    assert response.status_code == 200
    assert response.json() == {"authenticated": False}


def test_login_success_authenticates_session():
    client = TestClient(app)
    response = client.post(
        "/api/login", json={"username": "user", "password": "password"}
    )
    assert response.status_code == 200
    assert response.json() == {"authenticated": True}
    assert client.get("/api/session").json() == {"authenticated": True}


def test_login_wrong_password_rejected():
    client = TestClient(app)
    response = client.post(
        "/api/login", json={"username": "user", "password": "wrong"}
    )
    assert response.status_code == 401
    assert client.get("/api/session").json() == {"authenticated": False}


def test_logout_clears_session():
    client = TestClient(app)
    client.post("/api/login", json={"username": "user", "password": "password"})
    response = client.post("/api/logout")
    assert response.status_code == 200
    assert response.json() == {"authenticated": False}
    assert client.get("/api/session").json() == {"authenticated": False}
