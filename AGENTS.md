# AGENTS.md

This repository is a small FastAPI app for generating Brother label PDFs and sending them to a CUPS queue.

## Stack

- Python 3.12+
- Linux deployment target
- FastAPI for HTTP endpoints
- Jinja2 templates in `templates/`
- WeasyPrint for HTML-to-PDF rendering
- CUPS via `lp`, `lpadmin`, `lpstat`, and `lpoptions`
- `uv` for dependency and environment management

## Working Rules

- Prefer simple, direct changes over new abstractions.
- Refactor to reduce sprawl when touching code, but do not redesign the app unless asked.
- Do not plan for backwards compatibility unless explicitly required.
- Use package managers instead of editing dependency files manually.
- Use `uv add <package>` and `uv remove <package>` for dependency changes.
- Do not hand-edit `uv.lock` unless there is no alternative.

## App Shape

- The current FastAPI app lives in `printpage/__init__.py`.
- `printpage/__main__.py` is currently unused. If you add a CLI or module entrypoint, keep it thin.
- `templates/index.html` is the operator UI for previewing and printing labels.
- `templates/label.html` is the print layout rendered to PDF.

## Printing Flow

1. Request data is validated by `LabelRequest`.
2. `label.html` is rendered with Jinja2.
3. WeasyPrint turns the HTML into a PDF.
4. `/labels.pdf` returns the PDF for preview.
5. `/print` writes a temporary PDF and submits it with `lp`.

Keep this flow obvious. Avoid adding extra service layers unless the code actually becomes hard to follow.

## Printer And CUPS Notes

- The target printer is a Brother label printer behind CUPS.
- The queue name is currently hard-coded as `Brother_QL700`.
- Production assumptions are Linux-specific even if local development happens elsewhere.
- The deployed service user is expected to have passwordless `sudo` for `/usr/sbin/lpadmin`.
- Treat `lp`, `lpadmin`, `lpstat`, and `lpoptions` as required runtime commands.
- It is acceptable for printer configuration changes to call `sudo /usr/sbin/lpadmin ...` directly.
- If you make printer configuration configurable, prefer a single environment variable over a config system.
- Preserve straightforward `subprocess.run(...)` usage for `lp` unless there is a concrete reason to change it.

## Template And Layout Notes

- Label dimensions matter. Treat changes to `@page`, millimeter sizing, margins, and typography as functional changes.
- Keep generated HTML and CSS simple and deterministic so PDF output stays predictable.
- Do not introduce client-side frameworks for the current single-page UI.

## Testing And Validation

- Prefer tests around request validation, PDF generation, and print-command construction.
- `mise check` is a hard completion requirement for every task. Do not consider work complete until it passes.
- Do not send real print jobs during automated checks unless explicitly asked.
- Mock `subprocess.run` when testing `/print`.
- Mock `lpadmin`, `lpstat`, and `lpoptions` subprocess calls when testing printer configuration features.
- For manual verification, prefer:
  - `uv run uvicorn printpage:app --reload`
  - previewing via `/labels.pdf`
  - only using `/print` when a real printer is available and intended

## Change Guidance

- If the app stays small, keep related logic together instead of splitting files prematurely.
- If `printpage/__init__.py` starts getting crowded, split by responsibility:
  - request models
  - template/PDF rendering
  - print submission
- Keep names literal and implementation boring.
- Avoid introducing background workers, queues, databases, or auth unless the task explicitly requires them.
