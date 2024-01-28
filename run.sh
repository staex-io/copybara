#!/bin/bash

exec docker run --rm \
    --user "$(id -u):$(id -g)" \
    -it \
    -v "${PWD}":/frontend \
    --entrypoint="" \
    --workdir /frontend \
    -p 5173:5173 \
    node:18 "$@"
