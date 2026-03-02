#!/bin/bash
set -e

export GIT_SSH_COMMAND="ssh -i /home/deployer/.ssh/github_readonly -o StrictHostKeyChecking=accept-new"

cd /home/tars/apps/{{REPO_NAME}}
git pull origin main
docker compose build backend
docker compose up -d backend
sleep 5
curl --fail --retry 3 --retry-delay 3 http://localhost:{{BACKEND_PORT}}/api/v1/status
