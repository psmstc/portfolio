from __future__ import annotations

import html
import json
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = ROOT / "data"
WORKS_ROOT = ROOT / "works"
PORTFOLIO_DATA = DATA_ROOT / "portfolio-data.js"
PORTFOLIO_WORKS = DATA_ROOT / "portfolio-works.js"

OFFICE_EXTENSIONS = {".doc", ".docx", ".pptx", ".xlsx"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
TEXT_EXTENSIONS = {".txt", ".xml"}
DOWNLOAD_EXTENSIONS = {".rar", ".wxmx", ".zip", ".7z"}
IGNORED_FILES = {".gitkeep", "portfolio-data.js", "portfolio-works.js"}
_OFFICE_COLLISION_PATHS: set[Path] | None = None

ALIAS_TARGETS = {
    ("course-1", "1 семестр", "__root__"): "Информатика",
    ("course-1", "1 семестр", "ИТ в математике"): "Информационные технологии в математике",
    ("course-1", "1 семестр", "ИТ в физике"): "Физика",
    ("course-1", "1 семестр", "ОКА 1 семестр"): "Основы компьютерной алгебры",
    ("course-1", "2 семестр", "ИТ 2 семестр"): "Информационные технологии",
    ("course-2", "4 семестр", "бд"): "Базы данных",
    ("course-2", "4 семестр", "Выч тех"): "Вычислительная техника",
    ("course-2", "4 семестр", "ТКМ"): "Технологии компьютерного моделирования",
    ("course-3", "5 семестр", "Бизнес информатика"): "Основы бизнес-информатики",
    ("course-3", "5 семестр", "Информационные технологии в изучении иностранных языков"): "Информационные технологии в изучении иностранных языков",
    ("course-3", "5 семестр", "ИТ менеджмент"): "IT-менеджмент",
    ("course-3", "5 семестр", "ОКА 5 семестр"): "Основы компьютерной алгебры",
    ("course-3", "5 семестр", "сети 5 сем"): "Сети и телекоммуникации",
    ("course-3", "6 семестр", "prog6 lbs"): "Программирование",
    ("course-3", "6 семестр", "инженерная графика"): "Инженерная графика",
    ("course-3", "6 семестр", "МОГО"): "Математические основы глубокого обучения",
    ("course-3", "6 семестр", "ОКО"): "Основы корпоративного электронного обучения",
    ("course-3", "6 семестр", "ОМО"): "Основы машинного обучения",
    ("course-3", "6 семестр", "ТиТВД"): "Техники и технологии визуализации данных",
    ("course-4", "7 семестр", "Управление программными проектами"): "Управление программными проектами",
    ("course-4", "8 семестр", "it рекрутмент"): "IT-рекрутмент",
    ("course-4", "8 семестр", "атаян Информационные технологии оценки персонала"): "Информационные технологии оценки персонала",
    ("course-4", "8 семестр", "МИРИЦБ"): "Мировые информационные ресурсы и цифровые библиотеки",
    ("course-4", "8 семестр", "СПВИИТ"): "Социальные и профессиональные вопросы информатики и ИТ",
    ("course-4", "8 семестр", "Языки написания спецификаций"): "Языки написания спецификаций",
}


def js_string_value(raw: str) -> str:
    return json.loads(f'"{raw}"')


def parse_scoped_disciplines() -> dict[tuple[str, str], list[str]]:
    scopes: dict[tuple[str, str], list[str]] = defaultdict(list)
    current_tag = ""
    in_disciplines = False

    for line in PORTFOLIO_DATA.read_text(encoding="utf-8").splitlines():
        tag_match = re.search(r'tag:\s*"((?:\\.|[^"\\])*)"', line)
        if tag_match:
            current_tag = js_string_value(tag_match.group(1))

        if "disciplines:" in line and "[" in line:
            in_disciplines = True
            continue

        if in_disciplines and "]" in line:
            in_disciplines = False
            continue

        if not in_disciplines or not current_tag:
            continue

        item_match = re.search(r'^\s*"((?:\\.|[^"\\])*)",?\s*$', line)
        if not item_match:
            continue

        semester_number_match = re.search(r"\d+", current_tag)
        if not semester_number_match:
            continue

        semester_number = int(semester_number_match.group(0))
        course_id = f"course-{(semester_number + 1) // 2}"
        scopes[(course_id, current_tag)].append(js_string_value(item_match.group(1)))

    return scopes


def short_title(discipline: str) -> str:
    return discipline.rsplit(". ", 1)[-1]


def normalize(value: str) -> str:
    value = value.lower().replace("ё", "е")
    return re.sub(r"[^0-9a-zа-я]+", "", value)


def words(value: str) -> list[str]:
    return re.findall(r"[0-9a-zа-яё]+", value.lower())


def abbreviation(value: str) -> str:
    return "".join(word[0] for word in words(value))


def resolve_by_target(candidates: list[str], target: str) -> str | None:
    target_norm = normalize(target)
    exact_short = [item for item in candidates if normalize(short_title(item)) == target_norm]
    if exact_short:
        return exact_short[0]

    exact_full = [item for item in candidates if normalize(item) == target_norm]
    if exact_full:
        return exact_full[0]

    containing = [item for item in candidates if target_norm and target_norm in normalize(item)]
    if containing:
        return sorted(containing, key=len)[0]

    return None


def auto_resolve(candidates: list[str], folder_name: str) -> str | None:
    folder_norm = normalize(folder_name)
    folder_abbr = normalize(folder_name.replace("семестр", "").replace("сем", ""))
    folder_tokens = [token for token in words(folder_name) if token not in {"сем", "семестр", "lbs"}]

    for discipline in candidates:
        if folder_norm and folder_norm == normalize(short_title(discipline)):
            return discipline

    for discipline in candidates:
        if folder_abbr and folder_abbr == abbreviation(short_title(discipline)):
            return discipline

    scored: list[tuple[int, str]] = []
    for discipline in candidates:
        full_norm = normalize(discipline)
        short_norm = normalize(short_title(discipline))
        score = 0
        if folder_norm and folder_norm in full_norm:
            score += 6
        if folder_norm and folder_norm in short_norm:
            score += 8
        score += sum(2 for token in folder_tokens if normalize(token) in full_norm)
        score += sum(3 for token in folder_tokens if normalize(token) in short_norm)
        if score:
            scored.append((score, discipline))

    if scored:
        scored.sort(key=lambda item: (-item[0], len(item[1])))
        return scored[0][1]

    return None


def resolve_discipline(scopes: dict[tuple[str, str], list[str]], course_id: str, semester_tag: str, folder_name: str) -> tuple[str, bool]:
    candidates = scopes.get((course_id, semester_tag), [])
    all_disciplines = [item for values in scopes.values() for item in values]
    target = ALIAS_TARGETS.get((course_id, semester_tag, folder_name))

    if target:
        scoped = resolve_by_target(candidates, target)
        if scoped:
            return scoped, False

        global_match = resolve_by_target(all_disciplines, target)
        if global_match:
            return global_match, True

        return target, True

    automatic = auto_resolve(candidates, folder_name)
    if automatic:
        return automatic, False

    return folder_name, True


def web_path(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def generated_path_for(source: Path, extension: str) -> Path:
    relative = source.resolve().relative_to(DATA_ROOT)
    return (WORKS_ROOT / relative).with_suffix(extension)


def office_collision_paths() -> set[Path]:
    global _OFFICE_COLLISION_PATHS

    if _OFFICE_COLLISION_PATHS is not None:
        return _OFFICE_COLLISION_PATHS

    by_output: dict[Path, list[Path]] = defaultdict(list)
    for path in DATA_ROOT.rglob("*"):
        if path.is_file() and path.suffix.lower() in OFFICE_EXTENSIONS:
            by_output[generated_path_for(path, ".pdf")].append(path)

    _OFFICE_COLLISION_PATHS = {
        path.resolve()
        for paths in by_output.values()
        if len(paths) > 1
        for path in paths
    }
    return _OFFICE_COLLISION_PATHS


def office_pdf_path(source: Path) -> Path:
    default = generated_path_for(source, ".pdf")
    if source.resolve() not in office_collision_paths():
        return default

    return default.with_name(f"{source.stem}.{source.suffix[1:].lower()}.pdf")


def file_title(path: Path) -> str:
    return path.stem.strip()


def link_from_txt(path: Path) -> str | None:
    try:
        content = path.read_text(encoding="utf-8-sig").strip()
    except UnicodeDecodeError:
        content = path.read_text(encoding="cp1251", errors="ignore").strip()

    if re.match(r"^https?://", content):
        return content

    return None


def render_notebook_cell(cell: dict) -> str:
    cell_type = cell.get("cell_type", "")
    source = "".join(cell.get("source", []))

    if cell_type == "markdown":
        rendered_lines: list[str] = []
        for line in source.splitlines():
            heading = re.match(r"^(#{1,4})\s+(.+)$", line)
            if heading:
                level = len(heading.group(1)) + 1
                rendered_lines.append(f"<h{level}>{html.escape(heading.group(2))}</h{level}>")
            elif line.strip():
                rendered_lines.append(f"<p>{html.escape(line)}</p>")
        return "\n".join(rendered_lines)

    if cell_type != "code":
        return ""

    blocks = [f"<pre class=\"code\"><code>{html.escape(source)}</code></pre>"]
    for output in cell.get("outputs", []):
        data = output.get("data", {})
        text = output.get("text") or data.get("text/plain")
        image = data.get("image/png")

        if isinstance(image, str):
            blocks.append(f'<img class="output-image" src="data:image/png;base64,{image}" alt="Notebook output">')
        elif text:
            if isinstance(text, list):
                text = "".join(text)
            blocks.append(f"<pre class=\"output\">{html.escape(str(text))}</pre>")

    return "\n".join(blocks)


def convert_notebook(path: Path) -> Path | None:
    target = generated_path_for(path, ".html")
    target.parent.mkdir(parents=True, exist_ok=True)

    try:
        notebook = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None

    cells = "\n".join(render_notebook_cell(cell) for cell in notebook.get("cells", []))
    title = html.escape(file_title(path))
    content = f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{ margin: 0; padding: 24px; color: #1f1c19; background: #fffaf2; font-family: Verdana, sans-serif; }}
    main {{ max-width: 980px; margin: 0 auto; }}
    h1, h2, h3, h4, h5 {{ font-family: Georgia, serif; line-height: 1.12; }}
    .cell {{ margin: 0 0 18px; padding: 16px; border: 2px solid rgba(31, 28, 25, 0.18); border-radius: 14px; background: #fffdf8; }}
    pre {{ overflow: auto; white-space: pre-wrap; word-break: break-word; }}
    .code {{ background: #1f1c19; color: #fff7ed; padding: 14px; border-radius: 10px; }}
    .output {{ background: #f3e7da; padding: 14px; border-radius: 10px; }}
    .output-image {{ max-width: 100%; border-radius: 10px; }}
  </style>
</head>
<body>
  <main>
    <h1>{title}</h1>
    {''.join(f'<section class="cell">{render_notebook_cell(cell)}</section>' for cell in notebook.get("cells", []))}
  </main>
</body>
</html>
"""
    target.write_text(content, encoding="utf-8")
    return target


def create_work_entry(path: Path, nested_parts: list[str]) -> dict | None:
    extension = path.suffix.lower()
    title = file_title(path)
    note = "Папка: " + "/".join(nested_parts) if nested_parts else ""

    def base_entry(badge: str, type_: str, file: str) -> dict:
        entry = {
            "badge": badge,
            "title": title,
            "type": type_,
            "file": file,
        }
        if note:
            entry["note"] = note
        return entry

    if extension in OFFICE_EXTENSIONS:
        pdf_path = office_pdf_path(path)
        if pdf_path.exists() and pdf_path.stat().st_size > 0:
            entry = base_entry("PDF", "pdf", web_path(pdf_path))
            entry["source"] = web_path(path)
            entry["sourceLabel"] = "Исходный " + extension[1:].upper()
            return entry

        return base_entry(extension[1:].upper(), "download", web_path(path))

    if extension == ".pdf":
        return base_entry("PDF", "pdf", web_path(path))

    if extension == ".html":
        return base_entry("HTML", "html", web_path(path))

    if extension == ".ipynb":
        html_path = convert_notebook(path)
        if html_path:
            entry = base_entry("IPYNB", "html", web_path(html_path))
            entry["source"] = web_path(path)
            entry["sourceLabel"] = "Исходный IPYNB"
            return entry
        return base_entry("IPYNB", "download", web_path(path))

    if extension in IMAGE_EXTENSIONS:
        return base_entry(extension[1:].upper(), "image", web_path(path))

    if extension == ".mp4":
        return base_entry("MP4", "video", web_path(path))

    if extension == ".txt":
        link = link_from_txt(path)
        if link:
            return base_entry("Ссылка", "link", link)
        return base_entry("TXT", "text", web_path(path))

    if extension == ".xml":
        return base_entry("XML", "text", web_path(path))

    if extension in DOWNLOAD_EXTENSIONS:
        return base_entry(extension[1:].upper(), "download", web_path(path))

    return base_entry(extension[1:].upper() if extension else "Файл", "download", web_path(path))


def sort_work_key(entry: dict) -> str:
    return normalize(entry.get("title", ""))


def collect_works() -> tuple[dict, dict, list[str]]:
    scopes = parse_scoped_disciplines()
    works: dict[str, dict[str, dict[str, list[dict]]]] = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    extras: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
    report: list[str] = []

    for course_dir in sorted(DATA_ROOT.glob("*-course")):
        course_match = re.match(r"(\d+)-course$", course_dir.name)
        if not course_match:
            continue

        course_number = int(course_match.group(1))
        course_id = f"course-{course_number}"

        for semester_dir in sorted(course_dir.glob("semester-*")):
            semester_match = re.match(r"semester-(\d+)$", semester_dir.name)
            if not semester_match:
                continue

            semester_number = (course_number - 1) * 2 + int(semester_match.group(1))
            semester_tag = f"{semester_number} семестр"
            scope_files = [path for path in semester_dir.rglob("*") if path.is_file() and path.name not in IGNORED_FILES]

            for path in sorted(scope_files):
                relative = path.relative_to(semester_dir)
                parts = relative.parts

                if len(parts) == 1:
                    owner = "__root__"
                    nested_parts: list[str] = []
                else:
                    owner = parts[0]
                    nested_parts = list(parts[1:-1])

                discipline, is_extra = resolve_discipline(scopes, course_id, semester_tag, owner)
                entry = create_work_entry(path, nested_parts)
                if not entry:
                    continue

                works[course_id][semester_tag][discipline].append(entry)

                if is_extra and discipline not in extras[course_id][semester_tag]:
                    extras[course_id][semester_tag].append(discipline)
                    report.append(f"extra: {course_id} / {semester_tag} / {owner} -> {discipline}")

    clean_works = {}
    for course_id, semesters in works.items():
        clean_works[course_id] = {}
        for semester_tag, disciplines in semesters.items():
            clean_works[course_id][semester_tag] = {}
            for discipline, items in disciplines.items():
                clean_works[course_id][semester_tag][discipline] = sorted(items, key=sort_work_key)

    clean_extras = {
        course_id: {semester: sorted(items) for semester, items in semesters.items()}
        for course_id, semesters in extras.items()
    }

    return clean_works, clean_extras, report


def main() -> None:
    works, extras, report = collect_works()
    content = (
        "window.portfolioExtraDisciplines = "
        + json.dumps(extras, ensure_ascii=False, indent=2)
        + ";\n\n"
        + "window.portfolioWorks = "
        + json.dumps(works, ensure_ascii=False, indent=2)
        + ";\n"
    )
    PORTFOLIO_WORKS.write_text(content, encoding="utf-8")

    total = sum(
        len(items)
        for semesters in works.values()
        for disciplines in semesters.values()
        for items in disciplines.values()
    )
    print(f"wrote {PORTFOLIO_WORKS.relative_to(ROOT)}")
    print(f"works: {total}")
    print(f"extra disciplines: {sum(len(items) for semesters in extras.values() for items in semesters.values())}")
    for line in report:
        print(line)


if __name__ == "__main__":
    main()
