#!/bin/bash

meteor-build-client ../lob-wallet-build/`git rev-parse --abbrev-ref HEAD` --path "/"
