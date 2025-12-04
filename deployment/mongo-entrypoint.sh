#!/bin/bash

# Start MongoDB in background
mongod --fork --logpath /var/log/mongodb.log

# Run your script every time the container starts
mongosh --username "$MONGO_ROOT_USER" \
     --password "$MONGO_ROOT_PASSWORD" \
     --authenticationDatabase admin \
     /mongo-init.js

# Keep MongoDB running as PID 1
tail -f /var/log/mongodb.log
