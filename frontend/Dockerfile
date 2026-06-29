# Public site — static HTML/CSS/JS served by nginx.
# Proxies /api/, /dashboard/, /investor/, and /portal-assets/ to the backend container.

FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="twareshdenis-public-site"
LABEL org.opencontainers.image.description="Twaresh Denis public marketing site"

RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/

# nginx listens on 80 inside the container; host port 3000 is set in docker-compose (FRONTEND_PORT:80).
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
