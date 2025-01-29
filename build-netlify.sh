#!/bin/bash

# Deno build task script
echo "Starting Deno build task..."

DENO_VERSION=$(deno --version | grep "deno " | awk '{print $2}')

deno upgrade

# Running Deno task
deno task build

# Check if the task was successful
if [ $? -eq 0 ]; then
  echo "Deno build task completed successfully!"
else
  echo "Deno build task failed!"
  exit 1
fi
