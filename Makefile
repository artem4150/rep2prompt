.PHONY: run build test fmt lint

run:
	cd backend && go run ./cmd/api

build:
	cd backend && go build ./cmd/api

test:
	cd backend && go test ./...

fmt:
	cd backend && gofmt -w $$(go list -f '{{.Dir}}' ./...)

lint:
	cd backend && go vet ./...
