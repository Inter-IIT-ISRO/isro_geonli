!/bin/bash

docker run -d \
  --name backend \
  -p 5000:5000 \
  -e PORT=5000 \
  -e MODE=production \
  -e MONGO_URI="mongodb://YOUR_HOST_IP:27017/inter_iit" \
  -e MINIO_ENDPOINT="YOUR_HOST_IP" \
  -e MINIO_PORT=9000 \
  -e MINIO_ACCESS_KEY=minioadmin \
  -e MINIO_SECRET_KEY=minioadmin \
  -e MINIO_BUCKET=chat-images \
  -e JWT_SECRET="change_this_secret" \
  backend
