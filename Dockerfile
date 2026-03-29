FROM python:3.13-slim AS apt

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    cups-client \
    fonts-dejavu-core \
    libatlas3-base \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libgirepository-1.0-1 \
    libglib2.0-0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir "uvicorn[standard]" fastapi pydantic pillow jinja2 httpx click weasyprint

FROM apt

COPY pyproject.toml README.md /app/
COPY printpage /app/printpage
COPY entrypoint.sh /app/entrypoint.sh

RUN pip install --no-cache-dir .

EXPOSE 8000

CMD ["sh", "/app/entrypoint.sh"]
