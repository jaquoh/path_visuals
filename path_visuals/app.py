"""Run locally with: uv run uvicorn path_visuals.app:app --reload."""

import os
from pathlib import Path

from defusedxml.common import DefusedXmlException
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .catalog import Catalog

ROOT = Path(__file__).resolve().parent


def create_app(data_dir: Path | None = None) -> FastAPI:
    app = FastAPI(title="Path Visuals", version="0.1.0")
    catalog = Catalog(data_dir or Path(os.getenv("PATH_VISUALS_DATA", ROOT.parent / "data")))

    @app.get("/api/files")
    def files():
        return catalog.files()

    @app.get("/api/dataset")
    def dataset(name: str):
        try:
            return catalog.get(name)
        except FileNotFoundError as exc:
            raise HTTPException(404, "File no longer exists. Refresh the file list.") from exc
        except (ValueError, DefusedXmlException) as exc:
            raise HTTPException(422, str(exc)) from exc
        except OSError as exc:
            raise HTTPException(422, "Cannot read this file. Check its permissions.") from exc

    @app.get("/")
    def index():
        return FileResponse(ROOT / "static" / "index.html")

    app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")
    return app


app = create_app()
