from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import xlrd


YELLOW_INDEX = 13


@dataclass(frozen=True)
class YellowCell:
    sheet: str
    address: str
    merged_range: str | None
    value: str


def col_to_name(col_index: int) -> str:
    result = ""
    current = col_index + 1
    while current:
        current, remainder = divmod(current - 1, 26)
        result = chr(65 + remainder) + result
    return result


def a1(row_index: int, col_index: int) -> str:
    return f"{col_to_name(col_index)}{row_index + 1}"


def merge_to_a1(rlo: int, rhi: int, clo: int, chi: int) -> str:
    start = a1(rlo, clo)
    end = a1(rhi - 1, chi - 1)
    return start if start == end else f"{start}:{end}"


def cell_text(sheet: xlrd.sheet.Sheet, row_index: int, col_index: int) -> str:
    value = sheet.cell_value(row_index, col_index)
    text = str(value).replace("\r", " ").replace("\n", " ").strip()
    return " ".join(text.split())


def collect_yellow_cells(workbook: xlrd.book.Book) -> list[YellowCell]:
    rows: list[YellowCell] = []
    for sheet in workbook.sheets():
        seen_merges: set[tuple[int, int, int, int]] = set()
        merged_cells = list(sheet.merged_cells)
        for row_index in range(sheet.nrows):
            for col_index in range(sheet.ncols):
                xf_index = sheet.cell_xf_index(row_index, col_index)
                xf = workbook.xf_list[xf_index]
                bg_index = xf.background.pattern_colour_index
                if bg_index != YELLOW_INDEX:
                    continue

                merge = next(
                    (
                        item
                        for item in merged_cells
                        if item[0] <= row_index < item[1] and item[2] <= col_index < item[3]
                    ),
                    None,
                )
                if merge is not None:
                    if merge in seen_merges:
                        continue
                    seen_merges.add(merge)
                    top_row, _, left_col, _ = merge
                    value = cell_text(sheet, top_row, left_col)
                    rows.append(
                        YellowCell(
                            sheet=sheet.name,
                            address=a1(top_row, left_col),
                            merged_range=merge_to_a1(*merge),
                            value=value,
                        )
                    )
                    continue

                value = cell_text(sheet, row_index, col_index)
                rows.append(
                    YellowCell(
                        sheet=sheet.name,
                        address=a1(row_index, col_index),
                        merged_range=None,
                        value=value,
                    )
                )
    return rows


def to_markdown(rows: list[YellowCell]) -> str:
    lines = [
        "# Карта желтых ячеек XLS",
        "",
        "Автоматически снятые желтые ячейки из старого `.xls`.",
        "",
        "| Лист | Ячейка | Диапазон | Текущее значение |",
        "| --- | --- | --- | --- |",
    ]
    for row in rows:
        value = row.value.replace("|", "\\|")
        lines.append(
            f"| {row.sheet} | {row.address} | {row.merged_range or row.address} | {value} |"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export yellow cells from legacy XLS workbook.")
    parser.add_argument("--file", type=Path, required=True, help="Path to .xls file")
    parser.add_argument("--out", type=Path, required=True, help="Path to markdown output")
    args = parser.parse_args()

    workbook = xlrd.open_workbook(file_contents=args.file.read_bytes(), formatting_info=True)
    rows = collect_yellow_cells(workbook)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(to_markdown(rows), encoding="utf-8")
    print(f"yellow-cells={len(rows)} output={args.out}")


if __name__ == "__main__":
    main()
