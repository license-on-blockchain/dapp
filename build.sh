#!/bin/bash

meteor-build-client ../build/`git rev-parse --abbrev-ref HEAD` --path ""
