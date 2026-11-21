"""Interface for spikinglabs/room."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Event(BaseModel):
    model_config = ConfigDict(extra="forbid")

    do: Literal["open", "send", "close", "clock", "expire", "expires_at", "restart"]
    conn: str | None = Field(None, description="Name of the connection.")
    count: int | None = Field(None, ge=1, description="open: open this many connections, named conn1, conn2, ...")
    authed: bool = Field(False, description="open: hand back a connection that had already proved the link (a room that woke up).")
    frame: dict[str, Any] | None = Field(None, description="send: a message, sent as JSON text.")
    text: str | None = Field(None, description="send: raw text instead of a frame.")
    text_size: int | None = Field(None, ge=0, description="send: raw text of this many characters 'x'.")
    data_size: int | None = Field(None, ge=0, description="send: replace frame.data by this many characters 'x'.")
    ms: int | None = Field(None, ge=0, description="clock, expire: a moment, in milliseconds since 1970.")


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

    retention_days: int = Field(90, ge=0)
    events: list[Event] = Field(default_factory=list)
    room_ids: list[str] = Field(default_factory=list, description="Room ids to check against the allowed form.")


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    frames: dict[str, list[dict[str, Any]]] = Field(description="What each connection was sent, in order (error messages left out; connections sent nothing are not listed). A data text longer than 40 characters is shown as data null and size = its length.")
    closed: dict[str, dict[str, Any]] = Field(description="Connections the server closed: {code, reason}.")
    results: list[Any] = Field(description="Per event: null, or for expire and expires_at the answer.")
    entries: list[dict[str, Any]] = Field(description="What the room stores at the end: {seq, data}, long data shown as in frames.")
    has_auth: bool
    gone: bool
    room_id_ok: list[bool]
