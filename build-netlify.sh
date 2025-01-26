#!/bin/bash

# Deno build task script
echo "Starting Deno build task..."

deno --version
deno upgrade 2.1.7

# Running Deno task
deno task build

# Check if the task was successful
if [ $? -eq 0 ]; then
  echo "Deno build task completed successfully!"
else
  echo "Deno build task failed!"
  exit 1
fi
