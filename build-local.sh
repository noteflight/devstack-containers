#!/bin/bash

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

docker build --no-cache -t nf-devstack-shell ${DIR}/containers/nf-devstack-shell
docker build --no-cache -t nf-devstack-dynamodblocal ${DIR}/containers/nf-devstack-dynamodblocal
docker build --no-cache -t nf-devstack-elasticsearch ${DIR}/containers/nf-devstack-elasticsearch
