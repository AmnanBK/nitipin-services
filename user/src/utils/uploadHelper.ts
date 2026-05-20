import { Storage } from '@google-cloud/storage';
import path from 'path';

// Membuat instance Google Cloud Storage.
// Pastikan GOOGLE_APPLICATION_CREDENTIALS / keyFilename terkonfigurasi
const storage = new Storage();

// Mengambil nama bucket dari .env
const bucketName = process.env.GCS_BUCKET_NAME || 'jastip-bucket-default';
const bucket = storage.bucket(bucketName);

/**
 * Fungsi untuk meng-upload buffer gambar ke Google Cloud Storage
 * @param fileBuffer Buffer dari file gambar (dari multer)
 * @param originalName Nama asli file
 * @param mimeType Tipe MIME (image/jpeg, image/png, dll)
 * @returns Public URL dari gambar yang di-upload
 */
export const uploadToGCS = (fileBuffer: Buffer, originalName: string, mimeType: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Generate nama file unik menggunakan timestamp dan angka random di folder profiles/
    const fileExtension = path.extname(originalName);
    const uniqueFileName = `profiles/${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`;
    const blob = bucket.file(uniqueFileName);

    // Buat stream untuk upload buffer ke GCS
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: mimeType,
    });

    blobStream.on('error', (err) => {
      console.error('[GCS Upload Error]', err);
      reject(err);
    });

    blobStream.on('finish', () => {
      // Format public URL langsung
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${uniqueFileName}`;
      resolve(publicUrl);
    });

    // Jalankan penulisan stream
    blobStream.end(fileBuffer);
  });
};
