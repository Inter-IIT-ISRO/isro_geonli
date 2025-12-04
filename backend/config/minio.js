import { Client } from 'minio';
import { config } from "dotenv";
config();

export const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
});

export const BUCKET = process.env.MINIO_BUCKET || 'chat-images';
