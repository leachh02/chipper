# Chipper's optional clustering service. Built and run by docker-compose.yml
# at the repo root: docker compose --profile ai up -d
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Bake the model into the image, so the service never downloads anything
ENV CHIPPER_AI_MODEL_DIR=/models
COPY chipper_ai chipper_ai
RUN python -c "from chipper_ai.model import load; load()"

RUN useradd --system chipper
USER chipper
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1
CMD ["uvicorn", "chipper_ai.app:app", "--host", "0.0.0.0", "--port", "8000"]
