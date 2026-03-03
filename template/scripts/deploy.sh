#!/bin/bash
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/home/{{VPS_HOME_USER}}/apps/{{REPO_NAME}}}"
BRANCH="main"

export GIT_SSH_COMMAND="ssh -i /home/{{VPS_DEPLOYER_USER}}/.ssh/{{REPO_NAME}}_readonly -o StrictHostKeyChecking=accept-new"

cd "$DEPLOY_DIR"

# Fetch + reset instead of pull — handles wrong branch, local changes, version-bump commits
sudo -u {{VPS_HOME_USER}} git fetch origin "$BRANCH"
sudo -u {{VPS_HOME_USER}} git checkout "$BRANCH" 2>/dev/null || true
sudo -u {{VPS_HOME_USER}} git reset --hard "origin/$BRANCH"
sudo -u {{VPS_HOME_USER}} git clean -fd --exclude='.env*'

docker compose build backend
docker compose run --rm backend bun run db:push
docker compose up -d backend
sleep 5
curl --fail --retry 5 --retry-delay 3 --retry-connrefused http://localhost:{{BACKEND_PORT}}/api/v1/status
