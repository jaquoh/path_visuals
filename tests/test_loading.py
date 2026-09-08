import pytest

from path_visuals.loading import load_dataset


def test_csv_aliases_sort_and_preserve_unknown_floor(tmp_path):
    path = tmp_path / "track.csv"
    path.write_text(
        "user;timestamp;latitude;longitude\na;2026-01-01T01:00:00+01:00;52;13\na;2025-12-31T23:59:00Z;51;12\n"
    )
    track = load_dataset(path)["tracks"][0]
    assert track["object_id"] == "a"
    assert track["points"][0]["latitude"] == 51
    assert track["points"][0]["level"] is None
    assert track["points"][1]["time"] - track["points"][0]["time"] == 60


@pytest.mark.parametrize("value", ["nan", "inf", "91", "oops"])
def test_invalid_coordinate_reports_row(tmp_path, value):
    path = tmp_path / "bad.csv"
    path.write_text(f"timestamp,latitude,longitude\n2026-01-01T00:00:00Z,{value},13\n")
    with pytest.raises(ValueError, match="Row 2"):
        load_dataset(path)


def test_gpx_keeps_segment_breaks(tmp_path):
    path = tmp_path / "walk.gpx"
    path.write_text(
        '<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Walk</name><trkseg><trkpt lat="52" lon="13"><time>2026-01-01T00:00:00Z</time></trkpt></trkseg><trkseg><trkpt lat="53" lon="14"><time>2026-01-01T00:01:00Z</time></trkpt></trkseg></trk></gpx>'
    )
    tracks = load_dataset(path)["tracks"]
    assert len(tracks) == 1
    assert tracks[0]["points"][0]["segment"] != tracks[0]["points"][1]["segment"]


def test_empty_data_is_actionable(tmp_path):
    path = tmp_path / "empty.csv"
    path.write_text("timestamp,latitude,longitude\n")
    with pytest.raises(ValueError, match="No movement points"):
        load_dataset(path)


def test_tab_separated_bom_and_filename_identity(tmp_path):
    path = tmp_path / "sensor.tsv"
    path.write_text("\ufefftimestamp\tlat\tlng\n2026-01-01T00:00:00\t52\t13\n")
    track = load_dataset(path)["tracks"][0]
    assert track["object_id"] == "sensor"
    assert track["points"][0]["longitude"] == 13


def test_gpx_without_timestamp_is_rejected(tmp_path):
    path = tmp_path / "missing.gpx"
    path.write_text('<gpx><trk><trkseg><trkpt lat="52" lon="13"/></trkseg></trk></gpx>')
    with pytest.raises(ValueError, match="timestamp is required"):
        load_dataset(path)
