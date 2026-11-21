"""Interface for spikinglabs/meeting."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

TIMESTAMP = r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$"

Op = Literal[
    "rename", "settings", "phase", "close", "reopen", "join", "remove_person", "allow_back", "add_facilitator", "clear_ready",
    "timer_start", "timer_pause", "timer_resume", "timer_add", "timer_reset",
    "add_column", "update_column", "move_column", "delete_column",
    "share_card", "update_card", "delete_card", "group", "ungroup", "group_title", "vote",
    "add_agenda", "update_agenda", "move_agenda", "delete_agenda", "set_current", "notes_insert",
    "add_idea", "edit_idea", "delete_idea", "brainstorm", "vote_idea", "idea_to_action", "idea_to_agenda",
    "add_decision", "delete_decision", "add_action", "update_action", "delete_action",
]


class Step(BaseModel):
    model_config = ConfigDict(extra="forbid")

    op: Op
    by: str = Field("Ana", min_length=1, description="Who does it, by name.")
    now: str | None = Field(None, pattern=TIMESTAMP, description="Move the clock to this moment first.")
    ref: str | None = Field(None, description="Name for the one item this step creates.")
    args: dict[str, Any] = Field(default_factory=dict)


class Init(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = ""
    template: dict[str, Any] = Field(description="A template as the app holds it (camelCase: durationMin).")
    creator: str = Field(min_length=1, description="The creator's person id.")
    seed: str = Field(min_length=1, description="Ids of everything the start creates derive from this.")
    series_name: str | None = None
    facilitators: list[str] | None = None
    series: dict[str, str] | None = None
    defaults: dict[str, Any] | None = None


    previous: "Previous | None" = Field(None, description="The meeting this one follows, as it stands after its steps.")


class Previous(BaseModel):
    model_config = ConfigDict(extra="forbid")

    init: Init
    steps: list[Step] = Field(default_factory=list)


Init.model_rebuild()


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    now: str = Field(pattern=TIMESTAMP, description="The clock when the run starts.")
    room_id: str = Field("room1", min_length=1)
    init: Init | None = Field(None, description="Start a new meeting.")
    file: dict[str, Any] | str | None = Field(None, description="Open a meeting file (its JSON, or its text).")
    update: str | None = Field(None, description="Open a document: a base64 Yjs update.")
    steps: list[Step] = Field(default_factory=list)
    show: list[str] | None = Field(None, description="Limit the output view to these parts: top-level view keys (cards, votes, ...) or meta.<key>; notes only if 'notes' is listed. Default: everything.")
    export: bool = Field(False, description="Also return the document as a base64 Yjs update.")

    @model_validator(mode="after")
    def _one_source(self) -> "Input":
        if sum(x is not None for x in (self.init, self.file, self.update)) != 1:
            raise ValueError("give exactly one of init, file and update")
        return self


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    results: list[Literal["ok", "limit"]] = Field(description="One per step; limit: refused by a vote limit.")
    view: dict[str, Any] | None = Field(description="The meeting as readView reads it; null if the document holds no meeting.")
    notes: dict[str, str] = Field(description="Shared notes text per agenda item id.")
    update: str | None = None
