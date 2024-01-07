ARG VERSION=1.39.2
FROM denoland/deno:alpine-${VERSION}

WORKDIR /app

ADD main.ts main.ts

CMD ["deno", "run", "--allow-net", "main.ts"]
