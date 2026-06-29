#!/bin/sh
set -e

echo "Waiting for MySQL..."
until python - <<'PY'
import os, MySQLdb
try:
    MySQLdb.connect(
        host=os.environ.get("MYSQL_HOST", "db"),
        user=os.environ.get("MYSQL_USER", "twaresh"),
        passwd=os.environ.get("MYSQL_PASSWORD", "twareshpass"),
        db=os.environ.get("MYSQL_DATABASE", "twareshdenis"),
        port=int(os.environ.get("MYSQL_PORT", "3306")),
    )
    print("ready")
except Exception as e:
    raise SystemExit(1)
PY
do
  sleep 2
done

python manage.py migrate --noinput
python manage.py seed_site \
  --username "${ADMIN_USERNAME:-admin}" \
  --password "${ADMIN_PASSWORD:-admin123}" \
  --email "${ADMIN_EMAIL:-admin@twareshdenis.com}"
python manage.py collectstatic --noinput

exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers "${GUNICORN_WORKERS:-3}"
