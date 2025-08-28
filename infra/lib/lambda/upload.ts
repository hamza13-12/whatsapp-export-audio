// upload.ts

import { DynamoDB, S3 } from 'aws-sdk';

const s3 = new S3();
const dynamodb = new DynamoDB.DocumentClient();
const BUCKET_NAME = process.env.BUCKET_NAME!;
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880');
const UPLOADS_TABLE_NAME = process.env.UPLOADS_TABLE_NAME!;

interface FileUploadInfo {
  fileName: string;
  audioId: string;
  metadata: {
    fileHash?: string;
    [key: string]: string | undefined;
  }
}

interface UploadRequest {
  userId: string;
  files: FileUploadInfo[];
}

export const handler = async (event: any) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  if (!BUCKET_NAME || !UPLOADS_TABLE_NAME) {
    throw new Error('Required environment variables are not set.');
  }

  try {
    const body: UploadRequest = JSON.parse(event.body || '{}');
    const { userId, files } = body;

    if (!userId || !files || !Array.isArray(files) || files.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'userId and a non-empty files array are required.' }),
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    // Check for duplicate uploads
    const fileHashes = files
      .filter(f => f.metadata.fileHash)
      .map(f => f.metadata.fileHash as string);

    const existingUploads = new Set<string>();
    
    if (fileHashes.length > 0) {
      // Batch get items to check if files already uploaded
      const batchGetParams = {
        RequestItems: {
          [UPLOADS_TABLE_NAME]: {
            Keys: fileHashes.map(hash => ({
              userId,
              fileHash: hash
            }))
          }
        }
      };

      try {
        const batchGetResult = await dynamodb.batchGet(batchGetParams).promise();
        const items = batchGetResult.Responses?.[UPLOADS_TABLE_NAME] || [];
        items.forEach(item => {
          if (item.fileHash) {
            existingUploads.add(item.fileHash);
          }
        });
      } catch (error) {
        console.error('Error checking existing uploads:', error);
      }
    }
    
    // Generate a presigned URL for each file and upload its metadata
    const uploadData = await Promise.all(
      files.map(async (file) => {
        const { fileName, audioId, metadata } = file;
        
        // Check if already uploaded
        if (metadata.fileHash && existingUploads.has(metadata.fileHash)) {
          return {
            uploadUrl: null,
            fileName,
            audioId,
            alreadyUploaded: true,
          };
        }

        const audioKey = `voice-notes/${userId}/${audioId}.opus`;
        const metadataKey = `${audioKey}.metadata.json`;

        // Add server-side metadata
        const finalMetadata = {
          ...metadata,
          userId,
          sourceIp: event.requestContext.identity.sourceIp,
        };

        // Upload the metadata as a separate JSON file
        await s3.putObject({
          Bucket: BUCKET_NAME,
          Key: metadataKey,
          Body: JSON.stringify(finalMetadata, null, 2),
          ContentType: 'application/json',
        }).promise();

        // Save to DynamoDB
        if (metadata.fileHash) {
          await dynamodb.put({
            TableName: UPLOADS_TABLE_NAME,
            Item: {
              userId,
              fileHash: metadata.fileHash,
              audioId,
              fileName,
              uploadedAt: new Date().toISOString(),
              metadata: finalMetadata,
            }
          }).promise();
        }

        // Generate the presigned URL for the audio file
        const params = {
          Bucket: BUCKET_NAME,
          Key: audioKey,
          Expires: 60 * 60 * 24, // 24 hours
          ContentType: 'audio/opus',
          Metadata: finalMetadata,
        };

        const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
        
        return {
          uploadUrl,
          fileName,
          audioId,
        };
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ uploadData }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
  } catch (error: any) {
    console.error('Error generating pre-signed URLs', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
};