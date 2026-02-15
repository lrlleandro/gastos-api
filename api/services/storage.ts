import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const ACCESS_KEY_ID = process.env.SUPABASE_ACCESS_KEY_ID;
// The user provided the secret key in SUPABASE_KEY
const SECRET_ACCESS_KEY = process.env.SUPABASE_KEY;
const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'receipts';
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !SUPABASE_URL) {
  throw new Error('Supabase S3 credentials are required (URL, ACCESS_KEY_ID, KEY)');
}

// Extract project ref from URL (e.g., https://sgktcjcmegtyoabfasrd.supabase.co -> sgktcjcmegtyoabfasrd)
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/s3`;

const s3Client = new S3Client({
  forcePathStyle: true,
  region: 'us-east-1', // Arbitrary region for Supabase
  endpoint: endpoint,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

export const uploadFile = async (file: Express.Multer.File, userId: string): Promise<string | null> => {
  try {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      // ACL: 'public-read', // Supabase usually manages access via policies, but public buckets are readable
    });

    await s3Client.send(command);

    // Construct public URL manually
    // Format: https://<project_ref>.supabase.co/storage/v1/object/public/<bucket>/<key>
    const publicUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;

    return publicUrl;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
};
