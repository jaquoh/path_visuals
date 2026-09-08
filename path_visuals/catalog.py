"""Confined file discovery and bounded cache, invalidated when files change."""

from functools import lru_cache
from pathlib import Path

from .loading import SUPPORTED, load_dataset


class Catalog:
    def __init__(self, directory: Path):
        self.directory = directory.resolve()
        self._load = lru_cache(maxsize=4)(lambda path, mtime, size: load_dataset(path))

    def resolve(self, name: str) -> Path:
        path = self.directory / name
        if Path(name).name != name or path.is_symlink():
            raise ValueError("Choose a file inside the data folder.")
        if path.resolve().parent != self.directory or path.suffix.lower() not in SUPPORTED:
            raise ValueError("Unsupported dataset path.")
        return path

    def files(self) -> list[dict]:
        if not self.directory.exists():
            return []
        return [
            {"name": p.name, "bytes": p.stat().st_size}
            for p in sorted(self.directory.iterdir())
            if p.is_file() and not p.is_symlink() and p.suffix.lower() in SUPPORTED
        ]

    def get(self, name: str) -> dict:
        path = self.resolve(name)
        stat = path.stat()
        return self._load(path, stat.st_mtime_ns, stat.st_size)
