# TwinFlow sidecar. Distroless-style alpine image, non-root, no credentials baked in.
FROM golang:1.22-alpine AS build
WORKDIR /src
RUN apk add --no-cache ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
COPY configs ./configs
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/twinflow ./cmd/twinflow

FROM alpine:3.20
RUN apk add --no-cache ca-certificates wget \
    && adduser -D -H -u 10001 twinflow \
    && mkdir -p /var/lib/twinflow \
    && chown twinflow:twinflow /var/lib/twinflow
COPY --from=build /out/twinflow /usr/local/bin/twinflow
COPY configs/twinflow.yaml /etc/twinflow/twinflow.yaml
COPY examples/init.sql /etc/twinflow/init.sql
USER twinflow
WORKDIR /var/lib/twinflow
ENV TWINFLOW_CONFIG=/etc/twinflow/twinflow.yaml
ENV TWINFLOW_MIRROR_PATH=/var/lib/twinflow/mirror.db
EXPOSE 8741
ENTRYPOINT ["/usr/local/bin/twinflow"]
