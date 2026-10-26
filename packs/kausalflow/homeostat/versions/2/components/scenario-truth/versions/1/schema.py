"""Interface for kausalflow/scenario-truth. After editing, run `symbola schema .` to regenerate schema/*.json."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    """A valid, library-free scenario (see the description for the vocabulary)."""

    model_config = ConfigDict(extra="forbid")

    scenario: dict[str, Any]


class Role(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str
    loop: str = Field(description="The loop the role is relative to; empty for the global roles.")


class Signal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    signal: str
    level: str = Field(description="true, measured or internal.")
    observed: bool
    unit: str | None = Field(description="The declared unit, '' when none; null for a promoted parameter.")
    writer: str
    writer_op: str
    kind: str = Field(description="source, dynamic, feedback or observation.")
    roles: list[Role] = Field(description="Sorted by (role, loop).")


class Loop(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    controller: str
    regulated: str | None
    measured: str
    reference: str | None
    remote_reference: str | None
    mode: str | None
    manual: str | None
    output: str
    output_lo: float
    output_hi: float


class Edge(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    from_: str = Field(alias="from")
    to: str
    operator: str
    instantaneous: bool


class CausalGraph(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nodes: list[str]
    edges: list[Edge]


class Event(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    lane: int
    at: float
    applied_at: float
    target: str
    action: str
    value: float | None
    profile: str
    over: float
    label: str
    origin: str
    value_before: float | None
    value_after: float | None


class Promoted(BaseModel):
    model_config = ConfigDict(extra="forbid")

    operator: str
    parameter: str


class TimelineRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start: float
    end: float
    kind: str
    name: str
    targets: str


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    signals: list[Signal]
    loops: list[Loop]
    causal_graph: CausalGraph
    events: list[Event]
    promoted: dict[str, Promoted]
    timeline: list[TimelineRow]
