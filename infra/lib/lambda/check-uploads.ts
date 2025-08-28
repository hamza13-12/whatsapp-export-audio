// check-uploads.ts

import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();
const UPLOADS_TABLE_NAME = process.env.UPLOADS_TABLE_NAME!;

interface CheckUploadsRequest {
    userId: string;
    fileHashes: string[];
}

export const handler = async (event: any) => {
    console.log('Event received:', JSON.stringify(event, null, 2));

    if (!UPLOADS_TABLE_NAME) {
        throw new Error('UPLOADS_TABLE_NAME environment variable is not set.');
    }

    try {
        const body: CheckUploadsRequest = JSON.parse(event.body || '{}');
        const { userId, fileHashes } = body;

        if (!userId || !fileHashes || !Array.isArray(fileHashes)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'userId and fileHashes array are required.' }),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
            };
        }

        if (fileHashes.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ uploadedHashes: [] }),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
            };
        }

        const uploadedHashes = new Set<string>();

        // Batch check files in chunks of 100 (DynamoDB limit)
        const chunks = [];
        for (let i = 0; i < fileHashes.length; i += 100) {
            chunks.push(fileHashes.slice(i, i + 100));
        }

        for (const chunk of chunks) {
            const batchGetParams = {
                RequestItems: {
                    [UPLOADS_TABLE_NAME]: {
                        Keys: chunk.map(hash => ({
                            userId,
                            fileHash: hash
                        }))
                    }
                }
            };

            try {
                const result = await dynamodb.batchGet(batchGetParams).promise();
                const items = result.Responses?.[UPLOADS_TABLE_NAME] || [];

                items.forEach(item => {
                    if (item.fileHash) {
                        uploadedHashes.add(item.fileHash);
                    }
                });
            } catch (error) {
                console.error('Error batch getting items:', error);
                // Continue processing other chunks even if one fails
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                uploadedHashes: Array.from(uploadedHashes),
                checkedCount: fileHashes.length,
                uploadedCount: uploadedHashes.size
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
        };
    } catch (error: any) {
        console.error('Error checking uploads', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        };
    }
};