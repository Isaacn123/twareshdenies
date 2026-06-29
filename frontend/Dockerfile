# Public site — static HTML/CSS/JS served by nginx.
# nginx config is mounted on the server (not baked into the image).

FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="twareshdenis-public-site"
LABEL org.opencontainers.image.description="Twaresh Denis public marketing site"

COPY . /usr/share/nginx/html/

# nginx listens on 80 inside the container; host port 3000 is set in docker-compose (FRONTEND_PORT:80).
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
