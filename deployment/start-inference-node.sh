#!/bin/bash

pip install gdown


SAM3_REL_PATH="../inference/sam3/sam_model"
if [ ! -d "$SAM3_REL_PATH" ] || [ -z "$(ls -A $SAM3_REL_PATH 2>/dev/null)" ]; then
    echo "SAM3 missing. Downloading..."
    gdown https://drive.google.com/drive/folders/1P2e9nHGA8Sl27cbW6TAHD3-ZrcfIYRrS -O $SAM3_REL_PATH --folder
fi
SAM3_ABS_PATH=$(cd "$SAM3_REL_PATH" && pwd)

BERT_REL_PATH="../inference/sam3/bert_model_subtype"
if [ ! -d "$BERT_REL_PATH" ] || [ -z "$(ls -A $BERT_REL_PATH 2>/dev/null)" ]; then
    echo "BERT missing. Downloading..."
    gdown https://drive.google.com/drive/folders/1rbTuVncSDDb4LwKhF65RYJoBwUPBVdqo -O $BERT_REL_PATH --folder
fi
BERT_ABS_PATH=$(cd "$BERT_REL_PATH" && pwd)

TRANSFORMERS_DIR="../inference/sam3/transformers"
if [ ! -d "$TRANSFORMERS_DIR" ] || [ -z "$(ls -A $TRANSFORMERS_DIR 2>/dev/null)" ]; then
    echo "Transformers missing. Downloading..."
    git clone --depth 1 https://github.com/huggingface/transformers $TRANSFORMERS_DIR
fi

QWEN_REL_PATH="../inference/qwen/qwen_lora_model"
if [ ! -d "$QWEN_REL_PATH" ] || [ -z "$(ls -A $QWEN_REL_PATH 2>/dev/null)" ]; then
    echo "QWEN missing. Downloading..."
    gdown https://drive.google.com/drive/folders/1ez_3K-0Q3-6DIePvdH8x_lH1fjHGqFm1 -O $QWEN_REL_PATH --folder
fi
QWEN_ABS_PATH=$(cd "$QWEN_REL_PATH" && pwd)



run_if_not_exists() {
    local name=$1
    local port=$2
    local image_tag=$3
    local context_path=$4
    local volume_args=$5

    if [ "$(docker ps -q -f name=$name)" ]; then
        echo "⚠️  Container '$name' is already running. Skipping..."
    else
        echo "🚀 Building '$name'..."
        docker build -t $image_tag $context_path
        
        echo "🚀 Starting '$name'..."
        docker run -d \
          --name $name \
          --gpus all \
          -p $port:$port \
          $volume_args \
          $image_tag
    fi
}

echo "--- Initializing Inference Nodes ---"

run_if_not_exists "qwen" "3000" "qwen" "../inference/qwen" \
    "-v $QWEN_ABS_PATH:/app/qwen_lora_model"

run_if_not_exists "sam" "8000" "sam" "../inference/sam3" \
    "-v $SAM3_ABS_PATH:/app/sam_model -v $BERT_ABS_PATH:/app/bert_model_subtype"

echo ""
echo "✅ Inference nodes are active."
echo "Qwen: Port 3000 (Mapped to host model)"
echo "SAM:  Port 8000 (Mapped to host models)"