from fastapi.testclient import TestClient

from path_visuals.app import create_app

HEADER = "timestamp,latitude,longitude\n"
POINT = "2026-01-01T00:00:00Z,52,13\n"


def test_discovery_reload_and_invalid_file(tmp_path):
    client = TestClient(create_app(tmp_path))
    assert client.get("/api/files").json() == []
    path = tmp_path / "new.csv"
    path.write_text(HEADER + POINT)
    assert client.get("/api/files").json()[0]["name"] == "new.csv"
    assert client.get("/api/dataset", params={"name": "new.csv"}).json()["count"] == 1
    path.write_text(HEADER + POINT + POINT)
    assert client.get("/api/dataset", params={"name": "new.csv"}).json()["count"] == 2
    path.write_text("bad data")
    assert client.get("/api/dataset", params={"name": "new.csv"}).status_code == 422
    path.unlink()
    assert client.get("/api/dataset", params={"name": "new.csv"}).status_code == 404


def test_path_traversal_and_symlinks_are_rejected(tmp_path):
    client = TestClient(create_app(tmp_path))
    (tmp_path / "link.csv").symlink_to(tmp_path.parent / "outside.csv")
    for name in ["../outside.csv", "/etc/passwd", "link.csv"]:
        assert client.get("/api/dataset", params={"name": name}).status_code == 422
    assert client.get("/api/files").json() == []


def test_xml_entities_are_rejected(tmp_path):
    (tmp_path / "bad.gpx").write_text('<!DOCTYPE gpx [<!ENTITY x "test">]><gpx>&x;</gpx>')
    client = TestClient(create_app(tmp_path))
    assert client.get("/api/dataset", params={"name": "bad.gpx"}).status_code == 422


def test_app_and_demo_files():
    from pathlib import Path

    client = TestClient(create_app(Path(__file__).resolve().parents[1] / "data"))
    assert client.get("/").status_code == 200
    for file in client.get("/api/files").json():
        response = client.get("/api/dataset", params={"name": file["name"]})
        assert response.status_code == 200
        assert response.json()["count"] > 0
