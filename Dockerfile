FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY . .

EXPOSE 3000

CMD ["sh"]