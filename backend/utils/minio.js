import { minioClient, BUCKET } from '../config/minio.js';
import { v4 as uuid } from 'uuid';

export const saveImageAndGetObjectKey = async (file) => {
    const ext = file.originalname.split('.').pop();
    const objectKey = `uploads/${uuid()}.${ext}`;
    await minioClient.putObject(BUCKET, objectKey, file.buffer);
    return objectKey;
}

export const getPresignedUrl = async (key) => {
    const url = await minioClient.presignedGetObject(
        BUCKET,
        key,
        3600    // expires in 1 hour
    );

    return url;
};
