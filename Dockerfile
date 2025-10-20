FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache \
    libc6-compat \
    docker-cli \
    openssl \
    python3 \
    make \
    g++ \
    vips-dev

COPY . .

EXPOSE 3000

CMD ["sh"]