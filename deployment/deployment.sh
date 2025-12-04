#!/bin/bash

# Configuration
PROJECT_ROOT=".."
ENV_FILE=".env"

echo "=========================================="
echo "   ISRO GeoNLI Deployment Wizard"
echo "=========================================="

# 1. Gather Configuration
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env file..."
    
    # --- UPDATED IP DETECTION ---
    # Try ip route first (Standard Linux)
    if command -v ip >/dev/null 2>&1; then
        DETECTED_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($i=="src") print $(i+1)}')
    fi
    # Fallback to hostname -I (Ubuntu/Debian specific)
    if [ -z "$DETECTED_IP" ] && command -v hostname >/dev/null 2>&1; then
        DETECTED_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    # Final fallback
    DETECTED_IP=${DETECTED_IP:-127.0.0.1}
    # ----------------------------

    read -p "Enter Host IP (Default: $DETECTED_IP (Detected IP)): " HOST_IP
    HOST_IP=${HOST_IP:-$DETECTED_IP}
    
    read -p "Enter MongoDB/Minio Username (Default: admin_isro): " USERNAME
    USERNAME=${USERNAME:-admin_isro}
    
    read -p "Enter MongoDB/Minio Password (Default: secure_password): " PASSWORD
    PASSWORD=${PASSWORD:-secure_password}

    read -p "Enter MinIO Bucket Name (Default: chat-images): " MINIO_BUCKET
    MINIO_BUCKET=${MINIO_BUCKET:-chat-images}
    
    # Generate JWT Secret
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
EOF
    echo "Configuration saved to $ENV_FILE"
else
    echo "Existing configuration found."
    source "$ENV_FILE"
fi

# 2. Configure Frontend Environment (The Vite Way)
echo "Configuring Frontend Environment Variables..."
FRONTEND_ENV="$PROJECT_ROOT/frontend/.env"

# We write the VITE_ variable to the frontend's local .env file.
# When Docker builds the image, it copies this file in, and Vite reads it.
cat > "$FRONTEND_ENV" <<EOF
VITE_API_BASE_URL=http://$HOST_IP:5000/api
EOF
VITE_API_BASE_URL="http://$HOST_IP:5000/api"

echo "Frontend configured to talk to: http://$HOST_IP:5000/api"

# 3. Select Mode
echo ""
echo "Select Deployment Mode:"
echo "1) Single Machine (All services + Inference on this machine)"
echo "2) Core Only (Backend/Frontend/DBs - Inference is on another machine)"
echo "3) Reset (Stop all containers)"
read -p "Choice [1-3]: " CHOICE

case $CHOICE in
    1)
        echo "Starting Single Machine Deployment..."
        # Docker Compose automatically skips containers that are already up-to-date and running
        docker compose -f docker-compose.yml up -d --build
        echo ""
        echo "✅ Deployment Complete!"
        echo "Frontend: http://$HOST_IP:5173"
        echo "Backend:  http://$HOST_IP:5000"
        echo "MinIO:    http://$HOST_IP:9001"
        ;;
    2)
        echo ""
        echo "ℹ️  Core-only: inference runs on another machine."

        # If ENV already contains inference config, skip asking
        if [ -z "$GPU_MACHINE_IP" ] || [ -z "$QWEN_PORT" ] || [ -z "$SAM_PORT" ]; then
            
            echo "ℹ️  Inference settings not configured yet."

            read -p "Enter Inference Server Host (Default: $GPU_MACHINE_IP): " GPU_INPUT
            GPU_INPUT=${GPU_INPUT:-$GPU_MACHINE_IP}

            # Normalize protocol + trim slash
            GPU_CLEAN=${GPU_INPUT%/}
            if [[ "$GPU_CLEAN" != http://* ]] && [[ "$GPU_CLEAN" != https://* ]]; then
                GPU_MACHINE_IP="http://$GPU_CLEAN"
            else
                GPU_MACHINE_IP="$GPU_CLEAN"
            fi

            read -p "Enter Qwen Port (Default: ${QWEN_PORT:-3000}): " QWEN_PORT_IN
            QWEN_PORT=${QWEN_PORT_IN:-${QWEN_PORT:-3000}}

            read -p "Enter SAM Port (Default: ${SAM_PORT:-8000}): " SAM_PORT_IN
            SAM_PORT=${SAM_PORT_IN:-${SAM_PORT:-8000}}

            # Persist values to .env — modifies existing or appends
            sed -i "/GPU_MACHINE_IP=/d" .env 2>/dev/null
            sed -i "/QWEN_PORT=/d" .env 2>/dev/null
            sed -i "/SAM_PORT=/d" .env 2>/dev/null

            cat >> .env <<EOF
GPU_MACHINE_IP=$GPU_MACHINE_IP
QWEN_PORT=$QWEN_PORT
SAM_PORT=$SAM_PORT
EOF
            echo "🔒 Saved inference settings to .env"
        else
            echo "🔁 Using cached inference settings from .env"
        fi

        echo ""
        echo "Inference Host : $GPU_MACHINE_IP"
        echo "Qwen Port      : $QWEN_PORT"
        echo "SAM Port       : $SAM_PORT"

        export GPU_MACHINE_IP QWEN_PORT SAM_PORT VITE_API_BASE_URL

        echo ""
        echo "Starting Core Services..."
        docker compose -f docker-compose.core.yml up -d --build

        echo "🚀 Core Services Running."
        echo "Run 'deployment/start-inference-node.sh' on remote node."
        ;;

    3)
        echo "Stopping all containers..."
        docker compose -f docker-compose.yml down
        docker compose -f docker-compose.core.yml down
        # Also try to kill any manual inference containers if they exist locally
        docker rm -f isro_qwen isro_sam 2>/dev/null
        echo "Stopped."
        ;;
    *)
        echo "Invalid choice"
        ;;
esac
