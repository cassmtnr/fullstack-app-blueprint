#!/bin/bash
set -e

export GIT_SSH_COMMAND="ssh -i /home/{{VPS_DEPLOYER_USER}}/.ssh/github_readonly -o StrictHostKeyChecking=accept-new"

cd /home/{{VPS_HOME_USER}}/apps/{{REPO_NAME}}
git pull origin main
docker compose build backend
docker compose up -d backend
sleep 5
curl --fail --retry 3 --retry-delay 3 http://localhost:{{BACKEND_PORT}}/api/v1/status
