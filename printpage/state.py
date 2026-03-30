import json
from pathlib import Path

from pydantic import ValidationError

from .models import AppState, LabelProfile, LabelProfileInput, QueueConfig, default_profile
from .models import DEFAULT_STOCK_LENGTH_MM, DEFAULT_STOCK_WIDTH_MM
from .printer import DEFAULT_QUEUE_NAME

REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = REPO_ROOT / "printpage.json"


def build_default_state(queue_name: str | None = None) -> AppState:
    return AppState(
        queue_name=queue_name or DEFAULT_QUEUE_NAME,
        stock_width_mm=DEFAULT_STOCK_WIDTH_MM,
        stock_is_continuous=False,
        stock_length_mm=DEFAULT_STOCK_LENGTH_MM,
        selected_profile_id=None,
        profiles=[default_profile()],
    )


def load_state() -> AppState | None:
    if not CONFIG_PATH.exists():
        return None

    try:
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        state = AppState.model_validate(data)
        if state.model_dump() != data:
            save_state(state)
        return state
    except (json.JSONDecodeError, ValidationError):
        return None


def resolve_state(queue_name: str | None = None) -> AppState:
    state = load_state()
    if state is not None:
        return state

    state = build_default_state(queue_name)
    save_state(state)
    return state


def save_state(state: AppState) -> AppState:
    validated = AppState.model_validate(state)
    CONFIG_PATH.write_text(
        json.dumps(validated.model_dump(), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return validated


def update_queue(queue_config: QueueConfig) -> AppState:
    state = resolve_state()
    state.queue_name = queue_config.queue_name
    state.stock_width_mm = queue_config.stock_width_mm
    state.stock_is_continuous = queue_config.stock_is_continuous
    state.stock_length_mm = queue_config.stock_length_mm
    return save_state(state)


def create_profile(profile_input: LabelProfileInput) -> AppState:
    state = resolve_state()
    profile = LabelProfile(id=default_profile().id, **profile_input.model_dump())
    state.profiles.append(profile)
    state.selected_profile_id = profile.id
    return save_state(state)


def update_profile(profile_id: str, profile_input: LabelProfileInput) -> AppState:
    state = resolve_state()
    for index, profile in enumerate(state.profiles):
        if profile.id == profile_id:
            state.profiles[index] = LabelProfile(id=profile_id, **profile_input.model_dump())
            state.selected_profile_id = profile_id
            return save_state(state)
    raise KeyError(profile_id)


def delete_profile(profile_id: str) -> AppState:
    state = resolve_state()
    remaining = [profile for profile in state.profiles if profile.id != profile_id]
    if len(remaining) == len(state.profiles):
        raise KeyError(profile_id)

    state.profiles = remaining or [default_profile()]
    state.selected_profile_id = state.profiles[0].id
    return save_state(state)


def select_profile(profile_id: str) -> AppState:
    state = resolve_state()
    if profile_id not in {profile.id for profile in state.profiles}:
        raise KeyError(profile_id)

    state.selected_profile_id = profile_id
    return save_state(state)
