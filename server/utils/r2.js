const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
    },
});

const axios = require('axios');

const uploadToR2 = async (file, folder = 'avatars') => {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    });

    try {
        await r2Client.send(command);
        return `${process.env.R2_PUBLIC_URL}/${fileName}`;
    } catch (error) {
        console.error('R2 Upload Error:', error);
        throw new Error('Failed to upload image to R2');
    }
};

/**
 * Downloads an image from a URL and uploads it to R2
 */
const uploadFromUrlToR2 = async (url, folder = 'avatars') => {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        
        // Infer content type and extension
        const contentType = response.headers['content-type'] || 'image/jpeg';
        const extension = contentType.split('/')[1] || 'jpg';
        
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: contentType,
        });

        await r2Client.send(command);
        return `${process.env.R2_PUBLIC_URL}/${fileName}`;
    } catch (error) {
        console.error('Failed to download or upload image from URL:', error.message);
        // Fallback to original URL if upload fails to not break the flow
        return url;
    }
};

module.exports = { uploadToR2, uploadFromUrlToR2 };
