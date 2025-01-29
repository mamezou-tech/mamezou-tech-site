#!/bin/bash

# Deno build task script
echo "Starting Deno build task..."

# Temporarily disable the lockfile for older versions of Deno, such as 1.41
sed -i.bak 's/"lock": true/"lock": false/' "deno.json"

deno --version
deno upgrade

sed -i.bak 's/"lock": false/"lock": true/' "deno.json"

# Running Deno task
deno task build

# Check if the task was successful
if [ $? -eq 0 ]; then
  echo "Deno build task completed successfully!"
else
  echo "Deno build task failed!"
  exit 1
fi
