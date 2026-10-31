#!/usr/bin/env python3
"""Import bounded, dated VUC PDF/DOCX tables into a local Campus dataset.

DOCX uses only the standard library. PDF input additionally needs pdfplumber.
This is an operator-side importer, never an arbitrary-file HTTP upload service.
"""

import argparse
from collections import defaultdict
from datetime import date, datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import tempfile
from xml.etree import ElementTree as ET
from zipfile import BadZipFile, ZipFile

MAX_INPUT = 16 * 1024 * 1024
MAX_XML = 16 * 1024 * 1024
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W = "{" + NS["w"] + "}"
MONTHS = {name: i + 1 for i, name in enumerate(
    ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"]
)}
WEEKDAYS = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"]
TIME = re.compile(r"(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})")
PLATOON = re.compile(r"\d{3}[ос]?", re.I)


def compact(value):
    return re.sub(r"\s+", " ", value).strip()


def period(value):
    match = re.search(r"\bс\s+(\d{1,2})\s+([а-я]+)(?:\s+(\d{4})\s*г\.?)?\s+по\s+(\d{1,2})\s+([а-я]+)\s+(\d{4})", compact(value).lower())
    if not match:
        raise ValueError("Missing dated source period")
    d1, m1, y1, d2, m2, y2 = match.groups()
    end = date(int(y2), MONTHS[m2], int(d2))
    start = date(int(y1 or y2), MONTHS[m1], int(d1))
    if start > end or (end - start).days > 400:
        raise ValueError("Invalid source period")
    return start, end


def row_date(value, limits):
    match = re.fullmatch(r"\s*(\d{2})\s+(\d{2})\s*", value)
    if not match:
        # Separate Word runs occasionally have no actual whitespace.
        match = re.fullmatch(r"(\d{2})(\d{2})", value)
    if not match:
        return None
    day, month = map(int, match.groups())
    candidates = []
    for year in range(limits[0].year, limits[1].year + 1):
        try:
            candidate = date(year, month, day)
        except ValueError:
            continue
        if limits[0] <= candidate <= limits[1]:
            candidates.append(candidate)
    if len(candidates) != 1:
        raise ValueError("Source row date does not resolve within its section")
    return candidates[0]


def interval(value):
    match = TIME.fullmatch(compact(value))
    if not match:
        raise ValueError("Unsupported time header")
    h1, m1, h2, m2 = map(int, match.groups())
    start, end = h1 * 60 + m1, h2 * 60 + m2
    if h1 > 23 or h2 > 23 or m1 > 59 or m2 > 59 or not 0 <= start < end <= 1440:
        raise ValueError("Invalid time header")
    return {"start": start, "end": end}


def cell_text(cell):
    if cell.tag == W + "p":
        return "".join(t.text or "" for t in cell.findall(".//w:t", NS))
    return "\n".join("".join(t.text or "" for t in p.findall(".//w:t", NS)) for p in cell.findall(".//w:p", NS)).strip()


def word_cells(row, grid):
    before = row.find("w:trPr/w:gridBefore", NS)
    cursor = int(before.get(W + "val", "0")) if before is not None else 0
    result = []
    for cell in row.findall("w:tc", NS):
        span = cell.find("w:tcPr/w:gridSpan", NS)
        size = int(span.get(W + "val", "1")) if span is not None else 1
        if size <= 0 or cursor + size >= len(grid):
            raise ValueError("Invalid Word cell grid span")
        merge = cell.find("w:tcPr/w:vMerge", NS)
        result.append((grid[cursor], grid[cursor + size], cell_text(cell), merge is not None))
        cursor += size
    if cursor != len(grid) - 1:
        raise ValueError("Incomplete Word row grid")
    return result


def slot_range(left, right, slots, tolerance):
    boundaries = [s[0] for s in slots] + [slots[-1][1]]
    begin = min(range(len(boundaries)), key=lambda i: abs(left - boundaries[i]))
    end = min(range(len(boundaries)), key=lambda i: abs(right - boundaries[i]))
    if abs(left - boundaries[begin]) > tolerance or abs(right - boundaries[end]) > tolerance or begin >= end:
        raise ValueError("Cell edges do not align with time headers")
    return begin, end


def weekday_from(values):
    values = [re.sub(r"\s+", "", value).lower() for value in values]
    found = {i for i, name in enumerate(WEEKDAYS) for value in values if name in value or name[::-1] in value}
    if len(found) > 1:
        raise ValueError("Several weekdays in one table")
    return next(iter(found), None)


def docx_rows(path):
    with ZipFile(path) as archive:
        entry = archive.getinfo("word/document.xml")
        if entry.file_size > MAX_XML:
            raise ValueError("Word XML exceeds the input bound")
        root = ET.fromstring(archive.read(entry))
    limits = None
    table_index = 0
    for child in root.find("w:body", NS):
        if child.tag == W + "p":
            value = cell_text(child)
            if "по военной подготовке" in value.lower():
                limits = period(value)
        elif child.tag == W + "tbl":
            if limits is None:
                raise ValueError("Table has no dated section")
            table_index += 1
            grid = [0]
            for col in child.findall("w:tblGrid/w:gridCol", NS):
                width = int(col.get(W + "w", "0"))
                if width <= 0:
                    raise ValueError("Invalid table grid width")
                grid.append(grid[-1] + width)
            rows = child.findall("w:tr", NS)
            if len(rows) > 2000 or len(grid) > 100:
                raise ValueError("Word table exceeds the input bound")
            header = word_cells(rows[0], grid)
            if len(header) != 8:
                raise ValueError("Expected date, platoon and six time headings")
            slots = [(a, b, interval(value)) for a, b, value, _ in header[2:]]
            expected = weekday_from(cell_text(row.findall("w:tc", NS)[0]) for row in rows[1:])
            current = None
            for row_index, row in enumerate(rows[1:], 1):
                cells = word_cells(row, grid)
                current = row_date(compact(cells[0][2]), limits) or current
                platoon = compact(cells[1][2]).lower()
                if current is None or not PLATOON.fullmatch(platoon):
                    raise ValueError("Unresolved Word date or platoon row")
                parsed = []
                for cell_index, (left, right, value, merged_vertical) in enumerate(cells[2:], 2):
                    if merged_vertical:
                        raise ValueError("Vertical lesson merges require manual review")
                    if value:
                        try:
                            begin, end = slot_range(left, right, slots, 1)
                            intervals = [s[2] for s in slots[begin:end]]
                        except ValueError:
                            intervals = None
                        parsed.append((value, intervals, f"table-{table_index}:row-{row_index}:cell-{cell_index}", {"left": left, "right": right, "unit": "twip"}))
                yield current, platoon, parsed, expected, limits
            limits = None


def pdf_rows(path):
    try:
        import pdfplumber
    except ImportError as error:
        raise ValueError("PDF import needs pdfplumber; install it in a separate tool environment") from error
    with pdfplumber.open(path) as document:
        if len(document.pages) > 30:
            raise ValueError("PDF exceeds 30 pages")
        limits = period(document.pages[0].extract_text())
        slots = None
        expected = None
        current = None
        for page_index, page in enumerate(document.pages, 1):
            tables = page.find_tables()
            if len(tables) != 1:
                raise ValueError("Expected one geometric timetable per PDF page")
            table = tables[0]
            values = table.extract()
            header = len(values[0]) == 8 and "Взв." in (values[0][1] or "")
            if header:
                slots = [(cell[0], cell[2], interval(value)) for cell, value in zip(table.rows[0].cells[2:], values[0][2:])]
            if slots is None:
                raise ValueError("PDF page lacks a retained time header")
            expected = weekday_from(v[0] or "" for v in values) if expected is None else expected
            for row_index, (row, row_values) in enumerate(zip(table.rows, values)):
                if header and row_index == 0:
                    continue
                if len(row_values) != 8:
                    raise ValueError("Unexpected PDF column count")
                current = row_date(row_values[0] or "", limits) or current
                platoon = compact(row_values[1] or "").lower()
                if current is None or not PLATOON.fullmatch(platoon):
                    raise ValueError("Unresolved PDF date or platoon row")
                parsed = []
                for cell_index, (cell, value) in enumerate(zip(row.cells[2:], row_values[2:]), 2):
                    if cell is None:
                        continue
                    begin, end = slot_range(cell[0], cell[2], slots, 1)
                    if value:
                        parsed.append((value, [s[2] for s in slots[begin:end]], f"page-{page_index}:row-{row_index}:cell-{cell_index}", {"left": cell[0], "right": cell[2], "unit": "pt"}))
                yield current, platoon, parsed, expected, limits


def lesson_fields(value):
    raw = value.strip()
    flat = compact(raw)
    if len(raw) > 3000 or not flat:
        raise ValueError("Lesson text exceeds the input bound")
    teacher = re.search(r"[А-ЯЁ][а-яё-]+\s+[А-ЯЁ]\.\s*[А-ЯЁ]\.", flat)
    vacancy = re.search(r"\bВакант\b", flat, re.I)
    cut = teacher.start() if teacher else vacancy.start() if vacancy else len(flat)
    prefix = flat[:cut].strip(" ,.")
    teachers = flat[cut:].strip(" ,")
    room = ""
    marker = re.search(r"(?:кл\.?\s*|ауд\.?\s*)(.+)$", prefix, re.I)
    if marker:
        room, prefix = marker[1].strip(" ,."), prefix[:marker.start()].strip(" ,.")
    elif "плац" in prefix.lower():
        room = "плац"
        prefix = re.sub(r",?\s*плац", "", prefix, flags=re.I).strip(" ,.")
    else:
        marker = re.search(r",\s*(\d{1,2}-\d{3}|\d{3}(?:\s*,\s*\d{3})*)$", prefix)
        if marker:
            room, prefix = marker[1], prefix[:marker.start()].strip(" ,.")
    kind = re.search(r"\b(?:лек\.?|лекция|пр\.?\s*зан\.?|пр\.?\s*з\.?|гр\.?\s*з\.?|гр\.?\s*у\.?|сем\.?|зач[её]т|экзамен)\b\.?", prefix, re.I)
    subject = prefix[:kind.start()].strip(" ,.") if kind else prefix
    return {"subject": subject or prefix or flat, "kind": kind[0] if kind else "", "room": room, "teacher": teachers, "rawText": raw}


def import_document(path):
    if path.stat().st_size > MAX_INPUT:
        raise ValueError("Source document exceeds 16 MiB")
    revision = hashlib.sha256(path.read_bytes()).hexdigest()
    tag = revision[:12]
    suffix = path.suffix.lower()
    parse = docx_rows if suffix == ".docx" else pdf_rows if suffix == ".pdf" else None
    if parse is None:
        raise ValueError("Only PDF and DOCX inputs are supported")
    results = {}
    periods = set()
    for day, platoon, cells, expected, limits in parse(path):
        period_label = f"{limits[0].isoformat()} – {limits[1].isoformat()}"
        periods.add(period_label)
        owner = results.setdefault(platoon, {"dates": set(), "unresolved": set(), "warnings": set(), "dateWarnings": defaultdict(set), "lessons": [], "unparsedCells": []})
        owner["dates"].add(day.isoformat())
        if expected is not None and day.weekday() != expected:
            owner["unresolved"].add(day.isoformat())
            warning = f"{day.isoformat()}: дата не соответствует подписи дня недели в документе."
            owner["warnings"].add(warning)
            owner["dateWarnings"][day.isoformat()].add(warning)
        for value, intervals, origin, bounds in cells:
            if intervals is None:
                owner["unresolved"].add(day.isoformat())
                reason = "Границы ячейки не совпадают с заголовками времени; время не определено."
                warning = "Есть ячейки без установленного времени. Такие дни исключены из расчёта общих окон."
                owner["warnings"].add(warning)
                owner["dateWarnings"][day.isoformat()].add(warning)
                owner["unparsedCells"].append({"date": day.isoformat(), "rawText": value.strip(), "sourceOrigin": origin, "sourceBounds": bounds, "reason": reason})
                continue
            if any(a["end"] < b["start"] for a, b in zip(intervals, intervals[1:])):
                owner["unresolved"].add(day.isoformat())
                warning = "Объединённые ячейки показаны целым интервалом. Занятость перерывов не установлена; такие дни исключены из расчёта общих окон."
                owner["warnings"].add(warning)
                owner["dateWarnings"][day.isoformat()].add(warning)
            lesson = {
                "id": f"vuc:{tag}:{origin}",
                "date": day.isoformat(),
                "start": intervals[0]["start"],
                "end": intervals[-1]["end"],
                "building": "ВУЦ",
                "remote": False,
                "subgroups": [],
                "audience": f"Взвод {platoon}",
                "source": f"vuc:{tag}",
                "sourceIntervals": intervals,
                "sourceOrigin": origin,
                "sourceBounds": bounds,
                **lesson_fields(value),
            }
            owner["lessons"].append(lesson)
    if not results:
        raise ValueError("No platoon rows found")
    source_period = "; ".join(sorted(periods))
    schedules = []
    for platoon, result in sorted(results.items()):
        slug = platoon.replace("с", "s").replace("о", "o")
        schedules.append({
            "kind": "vuc",
            "id": f"d{tag}-p{slug}",
            "label": f"ВУЦ · взвод {platoon}",
            "description": source_period,
            "sourceLabel": "Документ ВУЦ · " + suffix[1:].upper(),
            "sourcePeriod": source_period,
            "documentSHA256": revision,
            "firstDate": min(result["dates"]),
            "lastDate": max(result["dates"]),
            "coveredDates": sorted(result["dates"] - result["unresolved"]),
            "unresolvedDates": sorted(result["unresolved"]),
            "warnings": sorted(result["warnings"]),
            "dateWarnings": {
                day: sorted(values)
                for day, values in sorted(result["dateWarnings"].items())
            },
            "unparsedCells": result["unparsedCells"],
            "lessons": sorted(
                result["lessons"],
                key=lambda item: (item["date"], item["start"], item["end"], item["id"]),
            ),
        })
    return schedules


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    if len(args.inputs) > 10:
        parser.error("At most ten source documents")
    schedules = []
    seen = set()
    try:
        for source in args.inputs:
            for schedule in import_document(source):
                if schedule["id"] in seen:
                    continue
                seen.add(schedule["id"])
                schedules.append(schedule)
        if len(schedules) > 100 or sum(len(s["lessons"]) for s in schedules) > 20000:
            raise ValueError("Dataset exceeds schedule or lesson bounds")
        dataset = {
            "version": 1,
            "importedAt": datetime.now(timezone.utc).isoformat(),
            "schedules": schedules,
        }
        body = json.dumps(dataset, ensure_ascii=False, indent=2) + "\n"
        if len(body.encode()) > 8 * 1024 * 1024:
            raise ValueError("Imported dataset exceeds 8 MiB")
        args.out.parent.mkdir(parents=True, exist_ok=True)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", dir=args.out.parent,
                prefix=args.out.name + ".", suffix=".tmp", delete=False,
            ) as handle:
                temporary = Path(handle.name)
                handle.write(body)
            temporary.replace(args.out)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
        print(f"Imported {len(schedules)} platoon schedules, {sum(len(s['lessons']) for s in schedules)} lessons; {sum(len(s['unresolvedDates']) for s in schedules)} unresolved platoon/dates.")
    except (ValueError, OSError, KeyError, ET.ParseError, BadZipFile) as error:
        parser.exit(1, f"Import failed: {error}\n")


if __name__ == "__main__":
    main()
