#!/bin/bash

ENV_FILE=".env"

echo "=================================================="
echo "   ISRO GeoNLI Single-Click Deployment"
echo "=================================================="

if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env file..."
    
    if command -v ip >/dev/null 2>&1; then
        DETECTED_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($i=="src") print $(i+1)}')
    fi
    if [ -z "$DETECTED_IP" ] && command -v hostname >/dev/null 2>&1; then
        DETECTED_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    DETECTED_IP=${DETECTED_IP:-127.0.0.1}

    read -p "Enter Host IP (Default: $DETECTED_IP): " HOST_IP
    HOST_IP=${HOST_IP:-$DETECTED_IP}
    
    read -p "Enter MongoDB/Minio Username (Default: admin_isro): " USERNAME
    USERNAME=${USERNAME:-admin_isro}
    
    read -p "Enter MongoDB/Minio Password (Default: secure_password): " PASSWORD
    PASSWORD=${PASSWORD:-secure_password}

    read -p "Enter MinIO Bucket Name (Default: chat-images): " MINIO_BUCKET
    MINIO_BUCKET=${MINIO_BUCKET:-chat-images}
    
    JWT_SECRET=$(openssl rand -hex 32)

    cat > "$ENV_FILE" <<EOF
HOST_IP=$HOST_IP
MONGO_ROOT_USER=$USERNAME
MONGO_ROOT_PASSWORD=$PASSWORD
MONGO_TARGET_DB=inter_iit
JWT_SECRET=$JWT_SECRET
MINIO_ROOT_USER=$USERNAME
MINIO_ROOT_PASSWORD=$PASSWORD
MINIO_BUCKET=$MINIO_BUCKET
VITE_API_BASE_URL=http://$HOST_IP:5000/api
EOF
    echo "✅ Configuration saved to $ENV_FILE"
else
    echo "ℹ️  Using existing .env configuration."
    source "$ENV_FILE"
fi

echo "Configuring Frontend..."
echo "VITE_API_BASE_URL=http://$HOST_IP:5000/api" > "../frontend/.env"

echo ""
echo "--- Checking Inference Models ---"
pip install gdown --quiet

ensure_dir() {
    local dir=$1
    local name=$2
    if [ ! -d "$dir" ] || [ -z "$(ls -A $dir 2>/dev/null)" ]; then
        echo "⬇️  $name missing. Downloading..."
        return 0
    else
        echo "✅ $name found."
        return 1
    fi
}

SAM3_DIR="../inference/sam3/sam_model"
ensure_dir "$SAM3_DIR" "SAM3 Model" && gdown https://drive.google.com/drive/folders/1P2e9nHGA8Sl27cbW6TAHD3-ZrcfIYRrS -O "$SAM3_DIR" --folder

BERT_DIR="../inference/sam3/bert_model_subtype"
ensure_dir "$BERT_DIR" "BERT Model" && gdown https://drive.google.com/drive/folders/1rbTuVncSDDb4LwKhF65RYJoBwUPBVdqo -O "$BERT_DIR" --folder

TRANSFORMERS_DIR="../inference/sam3/transformers"
ensure_dir "$TRANSFORMERS_DIR" "Huggingface Transformers" && git clone --depth 1 https://github.com/huggingface/transformers "$TRANSFORMERS_DIR"

QWEN_DIR="../inference/qwen/qwen_lora_model"
ensure_dir "$QWEN_DIR" "Qwen LoRA" && gdown https://drive.google.com/drive/folders/1ez_3K-0Q3-6DIePvdH8x_lH1fjHGqFm1 -O "$QWEN_DIR" --folder

echo ""
echo "--- Starting All Services ---"
export HOST_IP VITE_API_BASE_URL

docker compose -f docker-compose.yml up -d --build

echo ""
echo "========================================"
echo "🚀 Deployment Successful!"
echo "Frontend:  http://$HOST_IP:5173"
echo "Backend:   http://$HOST_IP:5000"
echo "MinIO:     http://$HOST_IP:9001"
echo "========================================"
