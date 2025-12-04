#!/bin/bash
# Run this on the GPU machine

# Function to check and run container
run_if_not_exists() {
    local name=$1
    local port=$2
    local image_tag=$3
    local context_path=$4

    if [ "$(docker ps -q -f name=$name)" ]; then
        echo "⚠️  Container '$name' is already running. Skipping..."
    else
        echo "🚀 Building and starting '$name'..."
        docker build -t $image_tag $context_path
        docker run -d \
          --name $name \
          --gpus all \
          -p $port:$port \
          $image_tag
    fi
}

echo "--- Initializing Inference Nodes ---"

run_if_not_exists "qwen" "3000" "qwen" "../inference/qwen"
run_if_not_exists "sam" "8000" "sam" "../inference/sam3"

echo ""
echo "✅ Inference nodes are active."
echo "Qwen: Port 3000"
echo "SAM:  Port 8000"
