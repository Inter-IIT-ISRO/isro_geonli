#!/bin/bash

pip install gdown

if [ ! -d "/app/your_folder_name" ]; then
    echo "Downloading data..."
    gdown https://drive.google.com/drive/folders/1P2e9nHGA8Sl27cbW6TAHD3-ZrcfIYRrS --folder
fi

# Start the app
exec uvicorn app:app --host 0.0.0.0 --port 8000