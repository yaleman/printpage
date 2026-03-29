import json
from pathlib import Path

import printpage

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "frontend" / "openapi.json"


def main() -> None:
    schema = printpage.app.openapi()
    SCHEMA_PATH.parent.mkdir(parents=True, exist_ok=True)
    SCHEMA_PATH.write_text(
        json.dumps(schema, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
