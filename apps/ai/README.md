# Chipper AI

An optional service that groups a backlog by topic, for a self-hosted Chipper server. It embeds each title with a small model ([all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), run through ONNX by [fastembed](https://github.com/qdrant/fastembed)), groups them with k-means, and names each group by the words that set it apart. Everything runs on your own machine; the model is built into the image.

Only the Chipper server talks to it. See [SELF_HOSTING.md](../../SELF_HOSTING.md#group-by-topic-optional) to turn it on.

## Developing

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
pytest
uvicorn chipper_ai.app:app --port 8000
```

Then run the server with `CHIPPER_AI_URL=http://127.0.0.1:8000`.

`POST /cluster` takes `{"items": [{"id", "text", "name"}], "groups": 5}` (leave out `groups` to let it choose; `name` is what groups are named from, and defaults to `text`) and returns `{"groups": [{"label", "ids"}]}`, largest first.
