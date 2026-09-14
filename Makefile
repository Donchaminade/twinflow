.PHONY: test vet build demo lint

export GOTOOLCHAIN := local

test:
	go test ./cmd/... ./internal/... -count=1

vet:
	go vet ./cmd/... ./internal/...

build:
	go build -o bin/twinflow ./cmd/twinflow

demo:
	cd examples/demo && npm run lint && npm run build
