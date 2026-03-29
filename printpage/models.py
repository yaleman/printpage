from uuid import uuid4

from pydantic import BaseModel, Field, model_validator

DEFAULT_PROFILE_NAME = "Default label"
DEFAULT_WIDTH_MM = 62.0
DEFAULT_HEIGHT_MM = 29.0
DEFAULT_CUT_EVERY = 1
DEFAULT_QUALITY = "BrQuality"
DEFAULT_QUANTITY = 1
DEFAULT_BORDER_THICKNESS_MM = 0.5
DEFAULT_BORDER_INSET_MM = 1.0
DEFAULT_BORDER_RADIUS_MM = 1.5
ROW_LEVELS = {"normal", "h1", "h2", "h3", "h4", "h5", "h6"}
ROW_ALIGNMENTS = {"left", "center", "right", "justify"}


class LabelRowInput(BaseModel):
    text: str = Field(default="", max_length=300)
    level: str = Field(default="normal")
    bold: bool = False
    italic: bool = False
    alignment: str = Field(default="left")

    @model_validator(mode="after")
    def normalize_row(self) -> "LabelRowInput":
        self.text = self.text.strip()
        self.level = self.level.strip().lower()
        self.alignment = self.alignment.strip().lower()

        if self.level not in ROW_LEVELS:
            raise ValueError("row level is invalid")
        if self.alignment not in ROW_ALIGNMENTS:
            raise ValueError("row alignment is invalid")

        return self


class LabelBorderInput(BaseModel):
    enabled: bool = False
    thickness_mm: float = Field(default=DEFAULT_BORDER_THICKNESS_MM, gt=0)
    inset_mm: float = Field(default=DEFAULT_BORDER_INSET_MM, ge=0)
    radius_mm: float = Field(default=DEFAULT_BORDER_RADIUS_MM, ge=0)


class LabelProfileInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    rows: list[LabelRowInput] = Field(..., min_length=1)
    border: LabelBorderInput = Field(default_factory=LabelBorderInput)
    width_mm: float = Field(..., gt=0)
    height_mm: float = Field(..., gt=0)
    is_continuous: bool = False
    cut_every: int = Field(default=DEFAULT_CUT_EVERY, ge=1)
    quality: str = Field(default=DEFAULT_QUALITY)
    quantity: int = Field(default=DEFAULT_QUANTITY, ge=1)

    @model_validator(mode="after")
    def normalize_strings(self) -> "LabelProfileInput":
        self.name = self.name.strip()
        self.quality = self.quality.strip()

        if self.quality not in {"BrSpeed", "BrQuality"}:
            raise ValueError("quality must be BrSpeed or BrQuality")
        if not self.name:
            raise ValueError("name cannot be empty")

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


class QueueState(BaseModel):
    queue_name: str = Field(..., min_length=1, max_length=200)
    queues: list[str] = Field(default_factory=list)
    default_queue: str | None = None


class PrintJobResult(BaseModel):
    ok: bool
    queue: str
    stdout: str = ""
    stderr: str = ""


def default_profile() -> LabelProfile:
    return LabelProfile(
        id=uuid4().hex,
        name=DEFAULT_PROFILE_NAME,
        rows=[
            LabelRowInput(
                text="New label",
                level="h2",
                bold=False,
                italic=False,
                alignment="center",
            )
        ],
        border=LabelBorderInput(),
        width_mm=DEFAULT_WIDTH_MM,
        height_mm=DEFAULT_HEIGHT_MM,
        is_continuous=False,
        cut_every=DEFAULT_CUT_EVERY,
        quality=DEFAULT_QUALITY,
        quantity=DEFAULT_QUANTITY,
    )
