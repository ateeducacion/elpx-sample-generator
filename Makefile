MAKEFLAGS += --no-print-directory
.DEFAULT_GOAL := help

PORT ?= 4173

.PHONY: help
help:
	@echo "Targets:"
	@echo "  make deps             Install dependencies with bun"
	@echo "  make download-themes   Sync themes from eXeLearning"
	@echo "  make download-idevices Sync iDevices from eXeLearning"
	@echo "  make download-dtd      Sync content.dtd from eXeLearning"
	@echo "  make download          Sync themes, iDevices and DTD"
	@echo "  make build             Sync assets and build dist/"
	@echo "  make up                Start the local static server"
	@echo "  make clean             Remove generated output"

.PHONY: deps
deps:
	@bun install

.PHONY: download-themes
download-themes:
	@bun run scripts/sync-exelearning.mjs themes

.PHONY: download-idevices
download-idevices:
	@bun run scripts/sync-exelearning.mjs idevices

.PHONY: download-dtd
download-dtd:
	@bun run scripts/sync-exelearning.mjs dtd

.PHONY: download
download:
	@bun run scripts/sync-exelearning.mjs all

.PHONY: build
build: deps download
	@bun run build

.PHONY: up
up: deps build
	@PORT=$(PORT) bun run dev

.PHONY: clean
clean:
	@rm -rf dist .cache/exelearning-src assets/exelearning
