"""Chipper's optional clustering service. Only the Chipper server calls it,
over the Docker network: it isn't meant to be reachable from outside."""

from fastapi import FastAPI
from pydantic import BaseModel, Field

from . import model
from .clustering import MAX_GROUPS, cluster

app = FastAPI(title="Chipper AI", docs_url=None, redoc_url=None)


class Item(BaseModel):
    id: str = Field(max_length=200)
    # What the model reads, e.g. a title with its channel
    text: str = Field(max_length=2000)
    # Words to name groups from, e.g. just the title. Defaults to text.
    name: str | None = Field(default=None, max_length=2000)


class ClusterRequest(BaseModel):
    items: list[Item] = Field(max_length=50_000)
    # None picks a number itself
    groups: int | None = Field(default=None, ge=2, le=MAX_GROUPS)


class Group(BaseModel):
    label: str
    ids: list[str]


class ClusterResponse(BaseModel):
    groups: list[Group]


@app.get("/health")
def health():
    return {"ok": True}


# A plain def runs in a worker thread, so a long grouping doesn't block /health
@app.post("/cluster")
def handle_cluster(request: ClusterRequest) -> ClusterResponse:
    groups = cluster(
        [item.id for item in request.items],
        [item.text for item in request.items],
        model.embed,
        request.groups,
        [item.name or item.text for item in request.items],
    )
    return ClusterResponse(groups=[Group(**g) for g in groups])
