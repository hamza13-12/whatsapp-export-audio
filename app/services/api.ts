import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import Safx from 'react-native-saf-x';
import { API_URL, CHECK_URL, LocationData } from '../constants/voiceNotes';
import { getUserId } from '../utils/audioUtils';

export const checkServerUploads = async (userId: string, fileHashes: string[]): Promise<{
    uploadedHashes: string[];
    uploadedCount: number;
}> => {
    const response = await fetch(CHECK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fileHashes }),
    });

    if (!response.ok) {
        throw new Error(`Server check failed: ${response.status}`);
    }

    return response.json();
};

export const uploadFile = async (
    filePath: string,
    fileName: string,
    fileHash: string,
    userLocation: LocationData | null
): Promise<boolean> => {
    try {
        const userId = await getUserId();
        const fileInfo = await Safx.stat(filePath);

        const metadata: any = {
            originalFilename: fileName,
            fileSize: fileInfo.size.toString(),
            fileHash: fileHash,
            createdAt: new Date(fileInfo.lastModified).toISOString(),
            uploadedAt: new Date().toISOString(),
        };

        if (userLocation) {
            metadata.location = JSON.stringify({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                ...(userLocation.city && { city: userLocation.city }),
                ...(userLocation.region && { region: userLocation.region }),
                ...(userLocation.country && { country: userLocation.country }),
                timestamp: userLocation.timestamp,
            });
        }

        const timestamp = Date.now();
        const audioId = `${timestamp}-${Crypto.randomUUID()}`;

        // Get presigned URL
        const presignedUrlResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                files: [{
                    fileName: fileName,
                    audioId,
                    metadata
                }]
            }),
        });

        if (!presignedUrlResponse.ok) {
            throw new Error(`Failed to get upload URL`);
        }

        const { uploadData } = await presignedUrlResponse.json();
        const uploadInfo = uploadData[0];

        if (uploadInfo.alreadyUploaded) {
            console.log(`File already uploaded on server: ${filePath}`);
            return true;
        }

        // Prepare file for upload
        const tempDir = (FileSystem.cacheDirectory || '') + 'voicetoupload/';
        await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
        const tempFileName = `${Date.now()}-${fileName}`;
        const tempUri = tempDir + tempFileName;

        try {
            const base64Content = await Safx.readFile(filePath, { encoding: 'base64' });
            await FileSystem.writeAsStringAsync(tempUri, base64Content, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const uploadResponse = await FileSystem.uploadAsync(uploadInfo.uploadUrl, tempUri, {
                httpMethod: 'PUT',
                headers: {
                    'Content-Type': 'audio/opus',
                },
                uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            });

            return uploadResponse.status === 200;
        } finally {
            await FileSystem.deleteAsync(tempUri, { idempotent: true });
        }
    } catch (error) {
        console.error(`Upload failed for ${filePath}:`, error);
        return false;
    }
};