import numpy as np
from fastapi.testclient import TestClient

from chipper_ai import app as service
from chipper_ai.clustering import cluster

TOPICS = ["cooking", "woodworking", "astronomy"]
TITLES = {
    "cooking": ["Easy pasta recipe cooking", "Cooking crispy chicken", "Bread baking for cooking", "Cooking curry recipe"],
    "woodworking": ["Woodworking dovetail joints", "Building an oak table woodworking", "Woodworking with hand planes", "Sharpening chisels woodworking"],
    "astronomy": ["Black holes explained astronomy", "Astronomy of Jupiter's moons", "Telescope astronomy for beginners", "Astronomy: how stars die"],
}


def fake_embed(texts):
    # One axis per topic, plus a little noise so items aren't identical
    rng = np.random.default_rng(0)
    rows = []
    for text in texts:
        row = np.array([1.0 if topic in text.lower() else 0.0 for topic in TOPICS])
        rows.append(row + rng.normal(0, 0.01, len(TOPICS)))
    return np.array(rows)


def items():
    texts = [t for topic in TOPICS for t in TITLES[topic]]
    return [f"id{i}" for i in range(len(texts))], texts


def test_finds_the_topics_and_names_them():
    ids, texts = items()
    groups = cluster(ids, texts, fake_embed, None)

    assert len(groups) == 3
    assert sorted(len(g["ids"]) for g in groups) == [4, 4, 4]
    labels = " ".join(g["label"] for g in groups)
    for topic in TOPICS:
        assert topic.capitalize() in labels
    # Every item lands in exactly one group
    assert sorted(i for g in groups for i in g["ids"]) == sorted(ids)


def test_uses_the_number_of_groups_asked_for():
    ids, texts = items()
    assert len(cluster(ids, texts, fake_embed, 5)) == 5
    # Never more groups than items allow
    assert len(cluster(ids[:5], texts[:5], fake_embed, 30)) == 4


def test_too_few_items_make_one_group():
    assert cluster(["a", "b"], ["One", "Two"], fake_embed, None) == [{"label": "Everything", "ids": ["a", "b"]}]
    assert cluster([], [], fake_embed, None) == []


def test_labels_are_unique_even_without_words():
    ids = [str(i) for i in range(6)]
    texts = ["123", "456", "789", "the", "and", "of"]
    labels = [g["label"] for g in cluster(ids, texts, fake_embed, 3)]
    assert len(set(labels)) == len(labels)


def test_names_come_from_names_when_given():
    ids, names = items()
    # The channel looks like the best word for the cooking group, but it's
    # only in the text the model groups by, not in the names
    texts = [f"{n} (Cookingchannel)" if "cooking" in n.lower() else n for n in names]
    labels = " ".join(g["label"] for g in cluster(ids, texts, fake_embed, 3, names))
    assert "Cookingchannel" not in labels
    assert "Cooking" in labels


def test_api(monkeypatch):
    monkeypatch.setattr(service.model, "embed", fake_embed)
    client = TestClient(service.app)
    ids, texts = items()

    response = client.post("/cluster", json={"items": [{"id": i, "text": t} for i, t in zip(ids, texts)], "groups": 3})
    assert response.status_code == 200
    assert len(response.json()["groups"]) == 3

    assert client.post("/cluster", json={"items": [], "groups": 1}).status_code == 422
    assert client.get("/health").json() == {"ok": True}
