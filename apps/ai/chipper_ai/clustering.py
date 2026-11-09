"""Groups a backlog by topic: embed each title, k-means the embeddings, then
name each group by the words from its titles that best match it."""

import re
from collections.abc import Callable, Sequence

import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
from sklearn.metrics import silhouette_score

# Turns texts into one row of numbers each
Embed = Callable[[Sequence[str]], np.ndarray]

# Below this there's nothing worth grouping
MIN_ITEMS = 4
# When choosing the number of groups itself, more than this stops being useful
MAX_AUTO_GROUPS = 12
MAX_GROUPS = 30
WORDS_PER_LABEL = 3


def choose_groups(embeddings: np.ndarray, requested: int | None) -> int:
    n = len(embeddings)
    if requested is not None:
        return max(2, min(requested, MAX_GROUPS, n - 1))

    # Pick the count whose groups are tightest and best separated
    best, best_score = 2, -1.0
    for k in range(2, min(MAX_AUTO_GROUPS, n - 1) + 1):
        labels = KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(embeddings)
        score = silhouette_score(embeddings, labels)
        if score > best_score:
            best, best_score = k, score
    return best


# Common in titles but says nothing about a topic
GENERIC_WORDS = {
    "best", "better", "big", "easy", "episode", "ever", "explained", "finally", "first", "full",
    "getting", "guide", "hours", "how", "live", "made", "make", "making", "minutes", "new",
    "official", "part", "seconds",
    "perfect", "really", "simple", "still", "tried", "ultimate", "video", "watch", "way", "worth",
}
WORD = re.compile(r"[^\W\d_][\w'-]{2,}")


def candidate_words(texts: list[str]) -> list[str]:
    words = {
        # "Jupiter's" is about Jupiter
        re.sub(r"'s$", "", w.lower()).strip("'-")
        for text in texts
        for w in WORD.findall(text)
    }
    return sorted(w for w in words if len(w) >= 3 and w not in ENGLISH_STOP_WORDS and w not in GENERIC_WORDS)


def label_groups(texts_by_group: list[list[str]], embed: Embed, centres: np.ndarray) -> list[str]:
    """Names each group by the words from its titles whose meaning is
    closest to the group's centre and furthest from the other groups'."""
    vocab = sorted({w for texts in texts_by_group for w in candidate_words(texts)})
    vectors = normalise(embed(vocab)) if vocab else np.zeros((0, centres.shape[1]))
    index = {w: i for i, w in enumerate(vocab)}
    similarity = vectors @ centres.T  # word x group

    labels: list[str] = []
    for g, texts in enumerate(texts_by_group):
        words = candidate_words(texts)
        scored = []
        for w in words:
            row = similarity[index[w]]
            others = np.delete(row, g)
            # How many of this group's titles use the word, as a small nudge
            share = sum(w in t.lower() for t in texts) / len(texts)
            scored.append((row[g] - 0.5 * (others.max() if len(others) else 0) + 0.1 * share, w))
        chosen: list[str] = []
        for _, w in sorted(scored, reverse=True):
            # "telescope" and "telescopes" are one word here
            if any(w.startswith(c) or c.startswith(w) for c in chosen):
                continue
            chosen.append(w)
            if len(chosen) == WORDS_PER_LABEL:
                break
        label = " · ".join(w.capitalize() for w in chosen) or f"Group {g + 1}"
        # Two groups can't share a name
        while label in labels:
            label = f"{label} ({g + 1})"
        labels.append(label)
    return labels


def normalise(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return vectors / np.where(norms == 0, 1, norms)


def cluster(
    ids: Sequence[str],
    texts: Sequence[str],
    embed: Embed,
    requested: int | None,
    names: Sequence[str] | None = None,
):
    """Groups by texts and names each group from names (the texts if not
    given). Returns [{"label", "ids"}], largest group first."""
    names = names or texts
    if len(ids) < MIN_ITEMS:
        return [{"label": "Everything", "ids": list(ids)}] if ids else []

    embeddings = normalise(embed([re.sub(r"\s+", " ", t).strip() for t in texts]))
    k = choose_groups(embeddings, requested)
    assignment = KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(embeddings)

    members: list[list[int]] = [[] for _ in range(k)]
    for index, group in enumerate(assignment):
        members[group].append(index)
    members = sorted((m for m in members if m), key=len, reverse=True)

    centres = normalise(np.array([embeddings[m].mean(axis=0) for m in members]))
    labels = label_groups([[names[i] for i in m] for m in members], embed, centres)
    return [{"label": label, "ids": [ids[i] for i in m]} for label, m in zip(labels, members)]
