#!/usr/bin/env python3
"""Aggregate audited, quality-masked annual Black Marble GeoTIFF tiles."""
import argparse
import datetime as dt
import json
from collections import defaultdict
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio as rio
from rasterio.features import rasterize
from shapely.geometry import box

UNIT = "nW/cm²/sr"
SOURCE = "NASA Black Marble VNP46A4 v2 · DOI 10.5067/VIIRS/VNP46A4.002"
GROUPS = {"América del Norte", "América del Sur", "Europa", "Asia", "África", "Oceanía"}


def aggregate(borders, input_path, scale):
    countries = gpd.read_file(borders).to_crs("EPSG:4326").reset_index(drop=True)
    fields = ("iso", "name", "continent")
    if not set(fields).issubset(countries.columns):
        raise ValueError("Los límites requieren los campos iso, name y continent")
    if countries.iso.duplicated().any() or not set(countries.continent).issubset(GROUPS):
        raise ValueError("Los códigos ISO deben ser únicos y los continentes compatibles")
    entries = json.loads(input_path.read_text())
    updated = dt.date.today().isoformat()
    records = []
    previous = {}
    seen = set()
    for entry in sorted(entries, key=lambda row: row["year"]):
        year = entry["year"]
        if year < 2012 or year in seen:
            raise ValueError(f"Año inválido o duplicado: {year}")
        seen.add(year)
        observation = dt.date.fromisoformat(entry["observation"])
        if observation.year != year or observation > dt.date.today():
            raise ValueError(f"Fecha de observación inválida: {observation}")
        sums = defaultdict(float)
        areas = defaultdict(float)
        extents = []
        for relative in entry["tiles"]:
            with rio.open(input_path.parent / relative) as src:
                transform = src.transform
                if (not src.crs or src.crs.to_epsg() != 4326 or transform.b != 0 or
                    transform.d != 0 or abs(transform.a - 1/240) > 1e-8 or
                    abs(transform.e + 1/240) > 1e-8 or src.nodata is None):
                    raise ValueError(f"Mosaico incompatible: {relative}")
                extent = box(*src.bounds)
                if any(extent.intersection(p).area > 1e-9 for p in extents):
                    raise ValueError(f"Teselas solapadas: {relative}")
                extents.append(extent)
                for _, window in src.block_windows(1):
                    bounds = rio.windows.bounds(window, transform)
                    matches = sorted(countries.sindex.query(box(*bounds), predicate="intersects"))
                    if not matches:
                        continue
                    raw = src.read(1, window=window, masked=True)
                    ids = rasterize(
                        [(countries.geometry.iloc[i], i + 1) for i in matches],
                        out_shape=raw.shape, transform=src.window_transform(window),
                        fill=0, all_touched=False, dtype="int32"
                    )
                    valid = (~np.ma.getmaskarray(raw)) & np.isfinite(raw.data) & (raw.data >= 0) & (ids > 0)
                    if not np.any(valid):
                        continue
                    latitude = bounds[3] + transform.e * (np.arange(raw.shape[0]) + .5)
                    area = (6371008.8 ** 2 * np.deg2rad(transform.a) * 2
                            * np.sin(np.deg2rad(abs(transform.e) / 2)) * np.cos(np.deg2rad(latitude)))
                    weights = np.broadcast_to(area[:, None], raw.shape)[valid]
                    keys = ids[valid]
                    regional_areas = np.bincount(keys, weights=weights)
                    regional_sums = np.bincount(keys, weights=weights * raw.data[valid])
                    for key in np.flatnonzero(regional_areas):
                        areas[key - 1] += regional_areas[key]
                        sums[key - 1] += regional_sums[key]
        for i, row in countries.iterrows():
            area = areas[i]
            value = sums[i] / area if area else None
            prior = previous.get(row.iso)
            change = (value-prior)*100/prior if value is not None and prior else None
            if value is not None:
                previous[row.iso] = value
            records.append(dict(
                territoryId=row.iso, iso=row.iso, name=row["name"], continent=row.continent,
                year=year, radiance=value, unit=UNIT, variation=change, validArea=area,
                source=SOURCE, observation=observation.isoformat(), updated=updated, status="validated"
            ))
    if not any(row["radiance"] is not None for row in records):
        raise ValueError("No hay observaciones utilizables")
    if scale < max(row["radiance"] or 0 for row in records):
        raise ValueError("scale-max debe cubrir todas las radiancias producidas")
    return {"mode": "validated", "scaleMax": scale, "records": records}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--borders", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("public/data/validated.json"))
    parser.add_argument("--scale-max", type=float, required=True)
    args = parser.parse_args()
    if not np.isfinite(args.scale_max) or args.scale_max <= 0:
        parser.error("scale-max debe ser positivo y finito")
    result = aggregate(args.borders, args.manifest, args.scale_max)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
    temporary.replace(args.output)
