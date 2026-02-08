.PHONY: build install

build:
	npm run build

# Copies to C:\Program Files\Pengu Loader\plugins\auto-champion-select\index.js
install: build
	cp dist/index.js "C:\Program Files\Pengu Loader\plugins\auto-champion-select\index.js"
