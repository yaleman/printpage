from uuid import uuid4

from pydantic import BaseModel, Field, model_validator

DEFAULT_PROFILE_NAME = "Default label"
DEFAULT_TITLE = "New label"
DEFAULT_WIDTH_MM = 62.0
DEFAULT_HEIGHT_MM = 29.0
DEFAULT_CUT_EVERY = 1
DEFAULT_QUALITY = "BrQuality"
DEFAULT_QUANTITY = 1


class LabelProfileInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=100)
    subtitle: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=1000)
    width_mm: float = Field(..., gt=0)
    height_mm: float = Field(..., gt=0)
    is_continuous: bool = False
    cut_every: int = Field(default=DEFAULT_CUT_EVERY, ge=1)
    quality: str = Field(default=DEFAULT_QUALITY)
    quantity: int = Field(default=DEFAULT_QUANTITY, ge=1)

    @model_validator(mode="after")
    def normalize_strings(self) -> "LabelProfileInput":
        self.name = self.name.strip()
        self.title = self.title.strip()
        self.subtitle = (self.subtitle.strip() or None) if self.subtitle else None
        self.body = (self.body.strip() or None) if self.body else None
        self.quality = self.quality.strip()

        if self.quality not in {"BrSpeed", "BrQuality"}:
            raise ValueError("quality must be BrSpeed or BrQuality")
        if not self.name:
            raise ValueError("name cannot be empty")
        if not self.title:
            raise ValueError("title cannot be empty")

        return self


class LabelProfile(LabelProfileInput):
    id: str = Field(..., min_length=1)


class AppState(BaseModel):
    queue_name: str = Field(..., min_length=1, max_length=200)
    selected_profile_id: str | None = None
    profiles: list[LabelProfile] = Field(default_factory=list)

    @model_validator(mode="after")
    def normalize_profiles(self) -> "AppState":
        self.queue_name = self.queue_name.strip()
        if not self.queue_name:
            raise ValueError("queue_name cannot be empty")

        if not self.profiles:
            self.profiles = [default_profile()]

        if self.selected_profile_id not in {profile.id for profile in self.profiles}:
            self.selected_profile_id = self.profiles[0].id

        return self


class QueueConfig(BaseModel):
    queue_name: str = Field(..., min_length=1, max_length=200)

    @model_validator(mode="after")
    def normalize_queue_name(self) -> "QueueConfig":
        self.queue_name = self.queue_name.strip()
        if not self.queue_name:
            raise ValueError("queue_name cannot be empty")
        return self


def default_profile() -> LabelProfile:
    return LabelProfile(
        id=uuid4().hex,
        name=DEFAULT_PROFILE_NAME,
        title=DEFAULT_TITLE,
        subtitle=None,
        body=None,
        width_mm=DEFAULT_WIDTH_MM,
        height_mm=DEFAULT_HEIGHT_MM,
        is_continuous=False,
        cut_every=DEFAULT_CUT_EVERY,
        quality=DEFAULT_QUALITY,
        quantity=DEFAULT_QUANTITY,
    )
