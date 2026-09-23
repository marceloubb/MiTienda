# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies first so the layer is cached across code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code. The build context is backend/ (see .dockerignore).
COPY . .

# Run as a non-root user. staticfiles must be writable so collectstatic can
# run at container start.
RUN useradd --user-group --create-home --shell /usr/sbin/nologin --uid 10001 appuser \
    && mkdir -p /app/staticfiles \
    && chown -R appuser:appuser /app/staticfiles

USER appuser

EXPOSE 8000

# Container start: apply pending migrations, collect static files (Django
# admin assets) served by WhiteNoise, then serve the WSGI app with gunicorn.
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput && exec gunicorn mitienda.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120"]