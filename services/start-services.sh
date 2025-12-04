#!/bin/bash

# 1. Load environment variables
if [ -f .env ]; then
  export $(cat .env | xargs)
else
  echo "Error: .env file not found. Please create it first."
  exit 1
fi

echo "--- Cleaning up old containers... ---"
docker rm -f minio mongodb 2>/dev/null || true
docker network create app-network 2>/dev/null || true

echo "--- Starting MinIO ---"
docker run -d \
  --name minio \
  --network app-network \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER="$MINIO_ROOT_USER" \
  -e MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" \
  minio/minio server /data --console-address ":9001"

echo "--- Starting MongoDB ---"
docker run -d \
  --name mongodb \
  --network app-network \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME="$MONGO_ROOT_USER" \
  -e MONGO_INITDB_ROOT_PASSWORD="$MONGO_ROOT_PASSWORD" \
  mongo:latest

echo "--- Waiting for MongoDB User Creation... ---"

# Wait for successful login
until docker exec mongodb mongosh \
  -u "$MONGO_ROOT_USER" \
  -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --quiet \
  --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
  
  echo "MongoDB up, but user '$MONGO_ROOT_USER' not ready yet. Retrying in 2s..."
  sleep 2
done

echo "--- Authentication Successful! Seeding data... ---"

# --- FIXED SECTION BELOW ---
# We use single quotes (') for the JS strings to avoid conflict with Bash double quotes (")
SEED_SCRIPT="
var dbName = '$MONGO_TARGET_DB';
var colName = '$MONGO_TARGET_COLLECTION';
var db = db.getSiblingDB(dbName);

if (db.getCollection(colName).countDocuments() === 0) {
    db.createCollection(colName);
    db.getCollection(colName).insertOne({
        'email': 'admin@isro.gov.in',
        'password': '',
        'role': 2,
        'isWhitelisted': true
    });
    print('SUCCESS: Initial document inserted.');
} else {
    print('INFO: Collection already has data. Skipping seed.');
}
"
# --- END FIXED SECTION ---

# Execute the seed script
docker exec mongodb mongosh \
  -u "$MONGO_ROOT_USER" \
  -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --eval "$SEED_SCRIPT"

echo "--- All Services Running ---"
echo "MinIO Console: http://localhost:9001"
echo "MongoDB URI: mongodb://$MONGO_ROOT_USER:******@localhost:27017"
