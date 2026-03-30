import shlex
import subprocess

from fastapi import HTTPException

from .models import LabelProfileInput, QueueStatus
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


def parse_lpstat_jobs(output: str) -> list[str]:
    job_ids: list[str] = []

    for raw_line in output.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        job_id = line.split(None, 1)[0]
        if job_id:
            job_ids.append(job_id)

    return job_ids


def parse_lpstat_printer_status(
    output: str,
) -> tuple[bool, bool, str, str | None]:
    status_line = next(
        (line.strip() for line in output.splitlines() if line.strip()), ""
    )
    if not status_line:
        return False, False, "unknown", None

    lowered = status_line.lower()
    if " disabled since " in lowered:
        return True, False, "disabled", status_line
    if " now printing " in lowered or " is printing " in lowered:
        return True, True, "printing", status_line
    if " is idle." in lowered:
        return True, True, "idle", status_line
    if " enabled since " in lowered:
        return True, True, "enabled", status_line

    return True, False, "unknown", status_line


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


def parse_lpoptions_defaults(output: str) -> dict[str, str]:
    defaults: dict[str, str] = {}

    for token in shlex.split(output.strip()):
        name, separator, value = token.partition("=")
        if not name:
            continue
        defaults[name] = value if separator else "true"

    return defaults


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


def get_queue_defaults(queue_name: str) -> dict[str, str]:
    proc = run_command(["lpoptions", "-p", queue_name])
    if proc.returncode != 0:
        raise HTTPException(
            status_code=404,
            detail=f"Failed to read saved printer defaults for {queue_name}: {proc.stderr.strip() or proc.stdout.strip()}",
        )

    return parse_lpoptions_defaults(proc.stdout)


def get_queue_job_ids(queue_name: str) -> list[str]:
    proc = run_command(["lpstat", "-o", queue_name])
    if proc.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read queue status for {queue_name}: {proc.stderr.strip() or proc.stdout.strip()}",
        )

    return parse_lpstat_jobs(proc.stdout)


def read_queue_status(queue_name: str) -> QueueStatus:
    printer_proc = run_command(["lpstat", "-l", "-p", queue_name])
    if printer_proc.returncode != 0:
        detail = printer_proc.stderr.strip() or printer_proc.stdout.strip() or None
        return QueueStatus(
            queue_name=queue_name,
            is_detected=False,
            is_online=False,
            status="missing",
            detail=detail,
            job_ids=[],
        )

    is_detected, is_online, status, detail = parse_lpstat_printer_status(
        printer_proc.stdout
    )
    jobs_proc = run_command(["lpstat", "-o", queue_name])
    job_ids: list[str] = []
    if jobs_proc.returncode == 0:
        job_ids = parse_lpstat_jobs(jobs_proc.stdout)
    elif detail is None:
        detail = jobs_proc.stderr.strip() or jobs_proc.stdout.strip() or None

    return QueueStatus(
        queue_name=queue_name,
        is_detected=is_detected,
        is_online=is_online,
        status=status,
        detail=detail,
        job_ids=job_ids,
    )


def mm_to_css(value: float) -> str:
    return f"{value:g}"


def media_size_value(width_mm: float, height_mm: float) -> str:
    return f"{mm_to_css(width_mm)}x{mm_to_css(height_mm)}"


def orientation_request_value(orientation: str) -> str:
    return "4" if orientation == "landscape" else "3"


def continuous_roll_media_value(
    width_mm: float,
    choices: dict[str, dict[str, str | list[str] | None]],
) -> str:
    page_size_choices = choices.get("PageSize", {}).get("choices")
    if not isinstance(page_size_choices, list):
        raise HTTPException(
            status_code=400,
            detail="Queue does not advertise PageSize choices for continuous roll media",
        )

    width_token = mm_to_css(width_mm).replace(".0", "")
    preferred_value = f"{width_token}X1"
    for choice in page_size_choices:
        if choice.upper() == preferred_value.upper():
            return choice

    raise HTTPException(
        status_code=400,
        detail=f"Queue does not advertise a continuous roll PageSize for {width_token}mm stock",
    )


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
) -> tuple[str, str, str, str]:
    choices = get_queue_choices(queue_name)
    cut_value, quality_key = validate_profile_options(queue_name, profile, choices)
    orientation_value = orientation_request_value(layout.applied_orientation)
    size_value = (
        continuous_roll_media_value(layout.media_width_mm, choices)
        if layout.is_continuous_roll_media
        else media_size_value(layout.page_width_mm, layout.page_height_mm)
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
        f"orientation-requested={orientation_value}",
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

    return size_value, cut_value, quality_key, orientation_value


def submit_print_job(
    queue_name: str,
    quantity: int,
    pdf_path: str,
    *,
    media_value: str,
    orientation_value: str,
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
        f"orientation-requested={orientation_value}",
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
