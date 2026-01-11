import json
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np

# ---------- Generate Descriptive Labels ----------
def label_clusters(clusters):
    cluster_labels = {}
    for cluster_id, vids in clusters.items():
        # Build TF-IDF over titles in this cluster
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf = vectorizer.fit_transform(vids)
        # Average the TF-IDF scores across docs
        scores = np.asarray(tfidf.mean(axis=0)).flatten()
        # Get top N keywords
        top_indices = scores.argsort()[::-1][:3]  # top 3 words
        keywords = [vectorizer.get_feature_names_out()[i] for i in top_indices]
        # Join keywords into label
        cluster_labels[cluster_id] = " / ".join(keywords)
    return cluster_labels

 # ---------- Load Data ----------
with open("watchlater.json", "r", encoding="utf-8") as f:
    videos = json.load(f)

# Build a mapping from title (with channel) to video index
title_to_index = {}
for v in videos:
    if "title" in v and "channel" in v and "index" in v:
        key = f'{v["title"]} ({v["channel"]})'
        title_to_index[key] = v["index"]

# titles = [v["title"] for v in videos if "title" in v]
titles = list(title_to_index.keys())

# ---------- Embeddings ----------
model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(titles, convert_to_numpy=True)

# ---------- Choose cluster count ----------
sil_scores = {}
for k in range(2, min(30, len(titles))):  # test 2–30 clusters
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)
    score = silhouette_score(embeddings, labels)
    sil_scores[k] = score

best_k = max(sil_scores, key=sil_scores.get)
print(f"Optimal clusters: {best_k}")

# ---------- Final clustering ----------
kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
labels = kmeans.fit_predict(embeddings)

# ---------- Group & Preview ----------
clusters = {}
for title, label in zip(titles, labels):
    clusters.setdefault(label, []).append(title)

# ---------- Show categories with labels ----------
cluster_labels = label_clusters(clusters)

# Build labeled_clusters: {label: [video_id, ...]}
labeled_clusters = {}
for cluster_id, vids in clusters.items():
    label = cluster_labels[cluster_id]  # e.g. "music / live / remix"
    # vids is a list of titles (with channel)
    idxs = [title_to_index.get(title) for title in vids if title_to_index.get(title) is not None]
    labeled_clusters[label] = idxs
    print(f"\n=== {label} ===")
    for t in vids[:5]:  # show first 5 per category
        print(" -", t)

# Save clusters as JSON
with open("clusters.json", "w", encoding="utf-8") as f:
    json.dump(labeled_clusters, f, ensure_ascii=False, indent=2)
