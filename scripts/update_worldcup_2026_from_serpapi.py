#!/usr/bin/env python3
"""
Update FIFA World Cup 2026 SQL match kickoff times using Google/SerpAPI sports_results.

Usage:
  export SERPAPI_API_KEY="your_key"
  python update_worldcup_2026_from_serpapi.py \
    --input "worldcup_2026_matches_es_utc_complete(1).sql" \
    --output worldcup_2026_matches_es_utc_serpapi.sql \
    --google-timezone America/New_York \
    --location "New York, United States" \
    --apply

Important:
- SerpAPI/Google usually returns the visible Google time localized to the search location.
- Set --google-timezone to the timezone that matches what you see in Google.
- The script converts that localized Google kickoff time to UTC before writing the SQL.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable
from zoneinfo import ZoneInfo

import requests
from dateutil import parser as dtparser

SERPAPI_ENDPOINT = "https://serpapi.com/search.json"

@dataclass
class SqlMatch:
    match_id: str
    group_name: str | None
    date_time_utc: datetime
    team_a: str
    team_b: str
    status: str
    stage: str
    raw_tuple: str

@dataclass
class SerpMatch:
    date_time_local: datetime
    date_time_utc: datetime
    team_a: str | None
    team_b: str | None
    tournament: str | None
    stadium: str | None
    status: str | None
    raw: dict[str, Any]


def sql_unquote(value: str) -> str | None:
    value = value.strip()
    if value.upper() == "NULL":
        return None
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1].replace("''", "'")
    return value


def split_sql_tuple(tuple_body: str) -> list[str]:
    parts: list[str] = []
    current: list[str] = []
    in_quote = False
    i = 0
    while i < len(tuple_body):
        ch = tuple_body[i]
        if ch == "'":
            current.append(ch)
            if in_quote and i + 1 < len(tuple_body) and tuple_body[i + 1] == "'":
                current.append("'")
                i += 2
                continue
            in_quote = not in_quote
        elif ch == "," and not in_quote:
            parts.append("".join(current).strip())
            current = []
        else:
            current.append(ch)
        i += 1
    parts.append("".join(current).strip())
    return parts


def extract_matches_from_sql(sql_text: str) -> list[SqlMatch]:
    # Matches tuples beginning with ('M001', ...). DOTALL handles line breaks.
    tuple_re = re.compile(r"\(\s*'(?P<id>M\d{3})'\s*,(?P<body>.*?)\)(?=,\n|\n\s*on conflict)", re.S)
    matches: list[SqlMatch] = []
    for m in tuple_re.finditer(sql_text):
        tuple_text = m.group(0)
        parts = split_sql_tuple(tuple_text[1:-1])
        if len(parts) != 9:
            print(f"WARN: skipping {m.group('id')} because tuple has {len(parts)} fields", file=sys.stderr)
            continue
        match_id = sql_unquote(parts[0]) or ""
        dt = dtparser.isoparse(sql_unquote(parts[2]) or "")
        matches.append(SqlMatch(
            match_id=match_id,
            group_name=sql_unquote(parts[1]),
            date_time_utc=dt,
            team_a=sql_unquote(parts[3]) or "TBD",
            team_b=sql_unquote(parts[4]) or "TBD",
            status=sql_unquote(parts[7]) or "",
            stage=sql_unquote(parts[8]) or "",
            raw_tuple=tuple_text,
        ))
    return matches


def normalize_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def walk_games(obj: Any) -> Iterable[dict[str, Any]]:
    if isinstance(obj, dict):
        if "teams" in obj and isinstance(obj.get("teams"), list) and ("date" in obj or "status" in obj):
            yield obj
        for v in obj.values():
            yield from walk_games(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from walk_games(item)


def parse_google_date(date_text: str, assumed_year: int, tz: ZoneInfo) -> datetime | None:
    if not date_text:
        return None
    cleaned = date_text.replace("Today", "").replace("Tomorrow", "").strip()
    # Google often returns strings like "Thu, Jun 11, 3:00 PM" without year.
    try:
        dt = dtparser.parse(cleaned, fuzzy=True, default=datetime(assumed_year, 1, 1, 12, 0))
    except Exception:
        return None
    if dt.year == 1900:
        dt = dt.replace(year=assumed_year)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=tz)
    return dt


def serpapi_search(query: str, api_key: str, location: str, hl: str, gl: str) -> dict[str, Any]:
    params = {
        "engine": "google",
        "q": query,
        "api_key": api_key,
        "location": location,
        "hl": hl,
        "gl": gl,
        "no_cache": "true",
    }
    r = requests.get(SERPAPI_ENDPOINT, params=params, timeout=45)
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise RuntimeError(f"SerpAPI error for {query!r}: {data['error']}")
    return data


def choose_best_serp_match(sql_match: SqlMatch, data: dict[str, Any], google_tz: ZoneInfo) -> SerpMatch | None:
    candidates = list(walk_games(data.get("sports_results", {})))
    if not candidates:
        return None

    a = normalize_name(sql_match.team_a)
    b = normalize_name(sql_match.team_b)
    best: tuple[int, dict[str, Any]] | None = None
    for game in candidates:
        teams = game.get("teams") or []
        names = [normalize_name(str(t.get("name", ""))) for t in teams if isinstance(t, dict)]
        joined = " ".join(names)
        score = 0
        if a and a != "tbd" and a in joined:
            score += 5
        if b and b != "tbd" and b in joined:
            score += 5
        tournament = str(game.get("tournament", "")).lower()
        if "world cup" in tournament or "fifa" in tournament:
            score += 3
        # Prefer dates near the existing SQL date, in case multiple games are returned.
        local_dt = parse_google_date(str(game.get("date", "")), 2026, google_tz)
        if local_dt:
            delta_hours = abs((local_dt.astimezone(ZoneInfo("UTC")) - sql_match.date_time_utc).total_seconds()) / 3600
            if delta_hours <= 48:
                score += 2
        if best is None or score > best[0]:
            best = (score, game)

    if not best or best[0] <= 0:
        return None

    game = best[1]
    local_dt = parse_google_date(str(game.get("date", "")), 2026, google_tz)
    if not local_dt:
        return None
    teams = game.get("teams") or []
    team_names = [t.get("name") for t in teams if isinstance(t, dict) and t.get("name")]
    return SerpMatch(
        date_time_local=local_dt,
        date_time_utc=local_dt.astimezone(ZoneInfo("UTC")),
        team_a=team_names[0] if len(team_names) >= 1 else None,
        team_b=team_names[1] if len(team_names) >= 2 else None,
        tournament=game.get("tournament"),
        stadium=game.get("stadium"),
        status=game.get("status"),
        raw=game,
    )


def sql_quote(s: str | None) -> str:
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def replace_tuple_datetime(sql_text: str, match_id: str, new_utc: datetime) -> str:
    iso = new_utc.astimezone(ZoneInfo("UTC")).isoformat().replace("+00:00", "+00:00")
    row_re = re.compile(rf"(\(\s*'{re.escape(match_id)}'\s*,(?P<body>.*?)\))(?=,\n|\n\s*on conflict)", re.S)

    def repl(m: re.Match[str]) -> str:
        tuple_text = m.group(1)
        parts = split_sql_tuple(tuple_text[1:-1])
        parts[2] = sql_quote(iso)
        return "(" + ", ".join(parts) + ")"

    return row_re.sub(repl, sql_text, count=1)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="Input SQL file")
    ap.add_argument("--output", required=True, help="Output SQL file")
    ap.add_argument("--api-key", default=os.getenv("SERPAPI_API_KEY"), help="SerpAPI key; default SERPAPI_API_KEY env var")
    ap.add_argument("--location", default="New York, United States", help="Google search location used by SerpAPI")
    ap.add_argument("--google-timezone", default="America/New_York", help="Timezone corresponding to Google's displayed kickoff times")
    ap.add_argument("--hl", default="en", help="Google UI language")
    ap.add_argument("--gl", default="us", help="Google country")
    ap.add_argument("--sleep", type=float, default=0.8, help="Delay between SerpAPI calls")
    ap.add_argument("--cache", default="serpapi_worldcup_2026_cache.json", help="JSON cache path")
    ap.add_argument("--diff-csv", default="worldcup_2026_serpapi_time_diff.csv", help="CSV audit output")
    ap.add_argument("--apply", action="store_true", help="Actually write SerpAPI times. Without this, only audit CSV is produced.")
    args = ap.parse_args()

    if not args.api_key:
        print("ERROR: pass --api-key or set SERPAPI_API_KEY", file=sys.stderr)
        return 2

    input_path = Path(args.input)
    output_path = Path(args.output)
    sql_text = input_path.read_text(encoding="utf-8")
    sql_matches = extract_matches_from_sql(sql_text)
    if len(sql_matches) != 104:
        print(f"WARN: expected 104 matches, found {len(sql_matches)}", file=sys.stderr)

    google_tz = ZoneInfo(args.google_timezone)
    utc = ZoneInfo("UTC")
    cache_path = Path(args.cache)
    cache: dict[str, Any] = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}

    audit_rows: list[dict[str, str]] = []
    updated_sql = sql_text

    for m in sql_matches:
        if m.team_a == "TBD" or m.team_b == "TBD":
            # For knockout TBD rows, query by match number/stage because teams are not known.
            query = f"FIFA World Cup 2026 match {int(m.match_id[1:])} {m.stage.replace('_', ' ')} kickoff time"
        else:
            query = f"{m.team_a} vs {m.team_b} FIFA World Cup 2026 kickoff time"

        if query not in cache:
            print(f"Querying {m.match_id}: {query}")
            cache[query] = serpapi_search(query, args.api_key, args.location, args.hl, args.gl)
            cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
            time.sleep(args.sleep)

        serp_match = choose_best_serp_match(m, cache[query], google_tz)
        old_utc = m.date_time_utc.astimezone(utc)
        row = {
            "match_id": m.match_id,
            "stage": m.stage,
            "team_a_sql": m.team_a,
            "team_b_sql": m.team_b,
            "old_utc": old_utc.isoformat(),
            "old_google_tz": old_utc.astimezone(google_tz).isoformat(),
            "serpapi_found": "yes" if serp_match else "no",
            "google_local": "",
            "new_utc": "",
            "delta_minutes": "",
            "serpapi_team_a": "",
            "serpapi_team_b": "",
            "stadium": "",
            "query": query,
        }
        if serp_match:
            new_utc = serp_match.date_time_utc.astimezone(utc)
            row.update({
                "google_local": serp_match.date_time_local.isoformat(),
                "new_utc": new_utc.isoformat(),
                "delta_minutes": str(int((new_utc - old_utc).total_seconds() / 60)),
                "serpapi_team_a": serp_match.team_a or "",
                "serpapi_team_b": serp_match.team_b or "",
                "stadium": serp_match.stadium or "",
            })
            if args.apply:
                updated_sql = replace_tuple_datetime(updated_sql, m.match_id, new_utc)
        audit_rows.append(row)

    with Path(args.diff_csv).open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(audit_rows[0].keys()))
        writer.writeheader()
        writer.writerows(audit_rows)

    if args.apply:
        output_path.write_text(updated_sql, encoding="utf-8")
        print(f"Wrote updated SQL: {output_path}")
    else:
        print("Dry run only. Re-run with --apply to write updated SQL.")
    print(f"Wrote audit CSV: {args.diff_csv}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
