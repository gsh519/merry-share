FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache \
    libc6-compat \
    docker-cli \
    openssl

COPY . .

EXPOSE 3000

CMD ["sh"]