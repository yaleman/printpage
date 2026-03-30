import shlex
import subprocess

from fastapi import HTTPException

from .models import LabelProfileInput
from .stock import ResolvedPrintLayout

DEFAULT_QUEUE_NAME = "Brother_QL700"


def run_command(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True)


def parse_lpstat_destinations(output: str) -> tuple[list[str], str | None]:
    queues: list[str] = []
    default_queue: str | None = None

    for line in output.splitlines():
        stripped = line.strip()
        if stripped.startswith("printer "):
            parts = stripped.split()
            if len(parts) >= 2:
                queues.append(parts[1])
        elif stripped.startswith("system default destination:"):
            default_queue = stripped.split(":", 1)[1].strip() or None

    return queues, default_queue


def parse_lpoptions_choices(
    output: str,
) -> dict[str, dict[str, str | list[str] | None]]:
    parsed: dict[str, dict[str, str | list[str] | None]] = {}

    for raw_line in output.splitlines():
        line = raw_line.strip()
        if not line or ":" not in line:
            continue

        name_part, values_part = line.split(":", 1)
        option_name, _, display_name = name_part.partition("/")

        choices: list[str] = []
        default_choice: str | None = None
        for token in shlex.split(values_part.strip()):
            choice = token.lstrip("*")
            choices.append(choice)
            if token.startswith("*"):
                default_choice = choice

        parsed[option_name] = {
            "display_name": display_name or option_name,
            "default": default_choice,
            "choices": choices,
        }

    return parsed


def get_available_queues() -> tuple[list[str], str | None]:
    proc = run_command(["lpstat", "-p", "-d"])
    if proc.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list printers: {proc.stderr.strip() or proc.stdout.strip()}",
        )

    return parse_lpstat_destinations(proc.stdout)


def get_default_queue_name() -> str:
    queues, default_queue = get_available_queues()
    if default_queue:
        return default_queue
    if queues:
        return queues[0]
    return DEFAULT_QUEUE_NAME


def get_queue_choices(queue_name: str) -> dict[str, dict[str, str | list[str] | None]]:
    proc = run_command(["lpoptions", "-p", queue_name, "-l"])
    if proc.returncode != 0:
        raise HTTPException(
            status_code=404,
            detail=f"Failed to read advertised printer options for {queue_name}: {proc.stderr.strip() or proc.stdout.strip()}",
        )

    return parse_lpoptions_choices(proc.stdout)


def mm_to_css(value: float) -> str:
    return f"{value:g}"


def media_size_value(width_mm: float, height_mm: float) -> str:
    return f"{mm_to_css(width_mm)}x{mm_to_css(height_mm)}"


def cups_media_value(width_mm: float, height_mm: float, *, use_custom: bool) -> str:
    base_value = media_size_value(width_mm, height_mm)
    if use_custom:
        return f"Custom.{base_value}mm"
    return base_value


def validate_profile_options(
    queue_name: str,
    profile: LabelProfileInput,
    choices: dict[str, dict[str, str | list[str] | None]],
) -> tuple[str, str]:
    cut_choices = choices.get("BrCutLabel", {}).get("choices")
    cut_value = str(profile.cut_every)
    if not isinstance(cut_choices, list) or cut_value not in cut_choices:
        raise HTTPException(
            status_code=400,
            detail=f"Queue {queue_name} does not support BrCutLabel={cut_value}",
        )

    quality_key = None
    if "BrPriority" in choices:
        quality_key = "BrPriority"
    elif "Quality" in choices:
        quality_key = "Quality"

    if quality_key is None:
        raise HTTPException(
            status_code=400,
            detail=f"Queue {queue_name} does not advertise a supported quality option",
        )

    quality_choices = choices.get(quality_key, {}).get("choices")
    if not isinstance(quality_choices, list) or profile.quality not in quality_choices:
        raise HTTPException(
            status_code=400,
            detail=f"Queue {queue_name} does not support {quality_key}={profile.quality}",
        )

    return cut_value, quality_key


def apply_profile_to_printer(
    queue_name: str,
    profile: LabelProfileInput,
    layout: ResolvedPrintLayout,
) -> tuple[str, str, str]:
    choices = get_queue_choices(queue_name)
    cut_value, quality_key = validate_profile_options(queue_name, profile, choices)
    size_value = cups_media_value(
        layout.page_width_mm,
        layout.page_height_mm,
        use_custom=layout.use_custom_media_size,
    )

    cmd = [
        "sudo",
        "/usr/sbin/lpadmin",
        "-p",
        queue_name,
        "-o",
        f"PageSize={size_value}",
        "-o",
        f"media={size_value}",
        "-o",
        f"BrCutLabel={cut_value}",
        "-o",
        "BrCutAtEnd=ON",
        "-o",
        f"{quality_key}={profile.quality}",
    ]
    proc = run_command(cmd)

    if proc.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply printer settings: {proc.stderr.strip() or proc.stdout.strip()}",
        )

    return size_value, cut_value, quality_key


def submit_print_job(
    queue_name: str,
    quantity: int,
    pdf_path: str,
    *,
    media_value: str,
    cut_value: str,
    quality_key: str,
    quality_value: str,
) -> dict[str, str | bool]:
    cmd = [
        "lp",
        "-d",
        queue_name,
        "-n",
        str(quantity),
        "-o",
        f"media={media_value}",
        "-o",
        f"BrCutLabel={cut_value}",
        "-o",
        "BrCutAtEnd=ON",
        "-o",
        f"{quality_key}={quality_value}",
        pdf_path,
    ]
    proc = run_command(cmd)

    if proc.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Print failed: {proc.stderr.strip() or proc.stdout.strip()}",
        )

    return {"ok": True, "queue": queue_name, "stdout": proc.stdout.strip()}
