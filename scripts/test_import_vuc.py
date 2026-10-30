"""Synthetic contract tests; no university documents or identities are embedded."""

import importlib.util
from pathlib import Path
import tempfile
import unittest
from xml.etree import ElementTree as ET
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location("import_vuc", Path(__file__).with_name("import-vuc.py"))
vuc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vuc)


def paragraph(parent, text):
    p = ET.SubElement(parent, vuc.W + "p")
    run = ET.SubElement(p, vuc.W + "r")
    ET.SubElement(run, vuc.W + "t").text = text


def make_document(path, sections):
    document = ET.Element(vuc.W + "document")
    body = ET.SubElement(document, vuc.W + "body")
    for title, grids, header_spans, rows in sections:
        paragraph(body, "по военной подготовке " + title)
        table = ET.SubElement(body, vuc.W + "tbl")
        grid = ET.SubElement(table, vuc.W + "tblGrid")
        for width in grids:
            ET.SubElement(grid, vuc.W + "gridCol", {vuc.W + "w": str(width)})
        header = [(value, span) for value, span in zip(["Дата", "Взв.", "9.00-10.30", "10.45-12.15", "12.30-14.00", "15.00-15.45", "15.50-16.35", "16.40-17.25"], header_spans)]
        for row in [header] + rows:
            tr = ET.SubElement(table, vuc.W + "tr")
            for value, span in row:
                cell = ET.SubElement(tr, vuc.W + "tc")
                props = ET.SubElement(cell, vuc.W + "tcPr")
                ET.SubElement(props, vuc.W + "gridSpan", {vuc.W + "val": str(span)})
                for text in value.split("\n"):
                    paragraph(cell, text)
    with ZipFile(path, "w") as archive:
        archive.writestr("word/document.xml", ET.tostring(document))


class ImportTests(unittest.TestCase):
    def test_grid_units_are_mapped_to_printed_periods(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "fixture.docx"
            row = [("03\n09", 1), ("101", 1), ("Учебный предмет", 6)] + [("", 1)] * 4
            make_document(path, [("с 03 сентября по 10 сентября 2026 г.", [100] * 12, [1, 1, 3, 3, 1, 1, 1, 1], [row])])
            result = vuc.import_document(path)[0]
            lesson = result["lessons"][0]
            self.assertEqual((lesson["start"], lesson["end"]), (540, 735))
            self.assertEqual(len(lesson["sourceIntervals"]), 2)
            self.assertEqual(result["coveredDates"], [])
            self.assertEqual(result["unresolvedDates"], ["2026-09-03"])
            self.assertEqual(lesson["sourceBounds"], {"left": 200, "right": 800, "unit": "twip"})

    def test_half_heading_cell_is_retained_without_invented_time(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "fixture.docx"
            row = [("03\n09", 1), ("101", 1), ("Неясная ячейка", 1), ("", 2), ("", 3)] + [("", 1)] * 4
            make_document(path, [("с 03 сентября по 10 сентября 2026 г.", [100] * 12, [1, 1, 3, 3, 1, 1, 1, 1], [row])])
            result = vuc.import_document(path)[0]
            self.assertEqual(result["lessons"], [])
            self.assertEqual(result["unresolvedDates"], ["2026-09-03"])
            self.assertEqual(result["unparsedCells"][0]["rawText"], "Неясная ячейка")
            self.assertNotIn("start", result["unparsedCells"][0])

    def test_sections_keep_their_year_and_platoon_coverage(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "fixture.docx"
            first = [("03\n09", 1), ("101", 1), ("Предмет А", 1)] + [("", 1)] * 5
            second = [("11\n01", 1), ("102", 1), ("Предмет Б", 1)] + [("", 1)] * 5
            weekday = [("Четверг", 1), ("103", 1), ("Предмет В", 1)] + [("", 1)] * 5
            make_document(path, [
                ("с 03 сентября по 10 сентября 2026 г.", [100] * 8, [1] * 8, [first]),
                ("с 26 ноября 2026 г. по 11 января 2027 г.", [100] * 8, [1] * 8, [second, weekday]),
            ])
            results = vuc.import_document(path)
            first_owner = next(s for s in results if s["label"].endswith("101"))
            second_owner = next(s for s in results if s["label"].endswith("102"))
            self.assertEqual(first_owner["coveredDates"], ["2026-09-03"])
            self.assertNotIn("2027-01-11", first_owner["coveredDates"])
            self.assertEqual(second_owner["lessons"][0]["date"], "2027-01-11")
            self.assertEqual(second_owner["unresolvedDates"], ["2027-01-11"])
            self.assertIn("дня недели", second_owner["warnings"][0])

    def test_invalid_header_and_oversized_xml_are_rejected(self):
        self.assertEqual(vuc.weekday_from(["к\nи\nн\nь\nл\nе\nд\nе\nн\nо\nП"]), 0)
        with self.assertRaises(ValueError):
            vuc.interval("9.90-10.30")
        with self.assertRaises(ValueError):
            vuc.period("Без периода")
        with self.assertRaises(ValueError):
            vuc.row_date("11 01", (vuc.date(2026, 9, 1), vuc.date(2026, 10, 8)))
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "large.docx"
            with ZipFile(path, "w") as archive:
                archive.writestr("word/document.xml", " " * (vuc.MAX_XML + 1))
            with self.assertRaises(ValueError):
                list(vuc.docx_rows(path))


if __name__ == "__main__":
    unittest.main()
