const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { fromSSO } = require('@aws-sdk/credential-provider-sso');
const { getAudioDurationInSeconds } = require('get-audio-duration');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Configuration
const CONCURRENT_DOWNLOADS = 20; // Adjust based on your internet speed
const PROGRESS_INTERVAL = 50; // Log progress every 50 files

// Configure AWS to use SSO
const s3Client = new S3Client({
    region: 'me-south-1',
    credentials: fromSSO({ profile: 'admin-access-353334976473' })
});

async function processAudioFile(bucketName, key, tempDir) {
    const tempFile = path.join(tempDir, `${Date.now()}-${Math.random().toString(36).substring(7)}.opus`);

    try {
        // Download the file
        const audioResponse = await s3Client.send(new GetObjectCommand({
            Bucket: bucketName,
            Key: key
        }));

        // Write to temp file
        const chunks = [];
        for await (const chunk of audioResponse.Body) {
            chunks.push(chunk);
        }
        await fs.writeFile(tempFile, Buffer.concat(chunks));

        // Get duration
        const duration = await getAudioDurationInSeconds(tempFile);

        // Clean up
        await fs.unlink(tempFile);

        return { success: true, duration, key };
    } catch (error) {
        // Clean up on error
        try {
            await fs.unlink(tempFile);
        } catch { }

        return { success: false, error: error.message, key };
    }
}

async function analyzeDataParallel() {
    const stage = process.env.STAGE || 'dev';
    const bucketName = `whatsapp-export-voice-notes-${stage}`;

    console.log(`Analyzing bucket: ${bucketName}`);
    console.log(`Using ${CONCURRENT_DOWNLOADS} concurrent downloads`);

    const users = new Set();
    const audioFiles = [];

    try {
        // First, list all objects (this is fast)
        console.log('Listing all objects...');
        let continuationToken;
        do {
            const response = await s3Client.send(new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: 'voice-notes/',
                ContinuationToken: continuationToken
            }));

            for (const obj of response.Contents || []) {
                const key = obj.Key;

                // Extract userId
                const match = key.match(/voice-notes\/([^/]+)/);
                if (match) {
                    users.add(match[1]);
                }

                // Collect audio files
                if (key.endsWith('.opus')) {
                    audioFiles.push(key);
                }
            }

            continuationToken = response.NextContinuationToken;
        } while (continuationToken);

        console.log(`Found ${audioFiles.length} audio files from ${users.size} users`);

        // Create temp directory
        const tempDir = path.join(os.tmpdir(), `voice-analysis-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });

        // Import p-limit dynamically
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(CONCURRENT_DOWNLOADS);

        // Process files in parallel
        console.log('Processing audio files...');
        const startTime = Date.now();

        let processedCount = 0;
        let totalDurationSeconds = 0;
        let errorCount = 0;

        // Create processing promises with rate limiting
        const processingPromises = audioFiles.map((key, index) =>
            limit(async () => {
                const result = await processAudioFile(bucketName, key, tempDir);

                processedCount++;

                if (result.success) {
                    totalDurationSeconds += result.duration;
                } else {
                    errorCount++;
                    console.error(`Error processing ${key}: ${result.error}`);
                }

                // Progress logging
                if (processedCount % PROGRESS_INTERVAL === 0 || processedCount === audioFiles.length) {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const rate = processedCount / elapsed;
                    const eta = (audioFiles.length - processedCount) / rate;

                    console.log(`Progress: ${processedCount}/${audioFiles.length} files (${((processedCount / audioFiles.length) * 100).toFixed(1)}%)`);
                    console.log(`  - Rate: ${rate.toFixed(1)} files/second`);
                    console.log(`  - ETA: ${(eta / 60).toFixed(1)} minutes`);
                    console.log(`  - Current duration: ${(totalDurationSeconds / 60).toFixed(1)} minutes`);
                    if (errorCount > 0) {
                        console.log(`  - Errors: ${errorCount}`);
                    }
                }

                return result;
            })
        );

        // Wait for all processing to complete
        const results = await Promise.all(processingPromises);

        // Clean up temp directory
        await fs.rmdir(tempDir, { recursive: true });

        // Calculate final statistics
        const successfulFiles = results.filter(r => r.success).length;
        const totalMinutes = (totalDurationSeconds / 60).toFixed(1);
        const totalHours = (totalDurationSeconds / 3600).toFixed(1);
        const avgDurationSeconds = successfulFiles > 0 ? (totalDurationSeconds / successfulFiles).toFixed(1) : 0;
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n=====================================');
        console.log('Data Collection Statistics:');
        console.log('=====================================');
        console.log(`Total Unique Users: ${users.size}`);
        console.log(`Total Audio Files: ${audioFiles.length}`);
        console.log(`Successfully Processed: ${successfulFiles}`);
        console.log(`Failed: ${errorCount}`);
        console.log(`Total Duration: ${totalMinutes} minutes (${totalHours} hours)`);
        console.log(`Average Duration per File: ${avgDurationSeconds} seconds`);
        console.log(`\nProcessing Time: ${totalTime} seconds`);
        console.log(`Average Speed: ${(successfulFiles / parseFloat(totalTime)).toFixed(1)} files/second`);

    } catch (error) {
        console.error('Error analyzing bucket:', error);
    }
}

// Add batching for even better performance with many files
async function analyzeDataBatched() {
    const stage = process.env.STAGE || 'dev';
    const bucketName = `whatsapp-export-voice-notes-${stage}`;
    const BATCH_SIZE = 500; // Process in batches to avoid memory issues

    console.log(`Analyzing bucket: ${bucketName} (Batched Mode)`);
    console.log(`Batch size: ${BATCH_SIZE}, Concurrent downloads per batch: ${CONCURRENT_DOWNLOADS}`);

    const users = new Set();
    const audioFiles = [];

    try {
        // List all objects
        console.log('Listing all objects...');
        let continuationToken;
        do {
            const response = await s3Client.send(new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: 'voice-notes/',
                ContinuationToken: continuationToken
            }));

            for (const obj of response.Contents || []) {
                const key = obj.Key;
                const match = key.match(/voice-notes\/([^/]+)/);
                if (match) {
                    users.add(match[1]);
                }
                if (key.endsWith('.opus')) {
                    audioFiles.push(key);
                }
            }

            continuationToken = response.NextContinuationToken;
        } while (continuationToken);

        console.log(`Found ${audioFiles.length} audio files from ${users.size} users`);

        // Process in batches
        const tempDir = path.join(os.tmpdir(), `voice-analysis-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });

        const startTime = Date.now();
        let totalDurationSeconds = 0;
        let totalProcessed = 0;
        let totalErrors = 0;

        for (let i = 0; i < audioFiles.length; i += BATCH_SIZE) {
            const batch = audioFiles.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(audioFiles.length / BATCH_SIZE);

            console.log(`\nProcessing batch ${batchNum}/${totalBatches} (${batch.length} files)...`);

            const limit = pLimit(CONCURRENT_DOWNLOADS);
            const batchPromises = batch.map(key =>
                limit(() => processAudioFile(bucketName, key, tempDir))
            );

            const batchResults = await Promise.all(batchPromises);

            // Update totals
            const batchSuccess = batchResults.filter(r => r.success);
            const batchDuration = batchSuccess.reduce((sum, r) => sum + r.duration, 0);

            totalDurationSeconds += batchDuration;
            totalProcessed += batchSuccess.length;
            totalErrors += batchResults.filter(r => !r.success).length;

            // Batch statistics
            const elapsed = (Date.now() - startTime) / 1000;
            const overallRate = totalProcessed / elapsed;

            console.log(`Batch ${batchNum} complete:`);
            console.log(`  - Successful: ${batchSuccess.length}/${batch.length}`);
            console.log(`  - Batch duration: ${(batchDuration / 60).toFixed(1)} minutes`);
            console.log(`  - Overall progress: ${totalProcessed}/${audioFiles.length} (${((totalProcessed / audioFiles.length) * 100).toFixed(1)}%)`);
            console.log(`  - Overall rate: ${overallRate.toFixed(1)} files/second`);
        }

        // Clean up
        await fs.rmdir(tempDir, { recursive: true });

        // Final statistics
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n=====================================');
        console.log('Final Statistics:');
        console.log('=====================================');
        console.log(`Total Unique Users: ${users.size}`);
        console.log(`Total Audio Files: ${audioFiles.length}`);
        console.log(`Successfully Processed: ${totalProcessed}`);
        console.log(`Failed: ${totalErrors}`);
        console.log(`Total Duration: ${(totalDurationSeconds / 60).toFixed(1)} minutes (${(totalDurationSeconds / 3600).toFixed(1)} hours)`);
        console.log(`Average Duration per File: ${(totalDurationSeconds / totalProcessed).toFixed(1)} seconds`);
        console.log(`\nTotal Processing Time: ${totalTime} seconds`);
        console.log(`Average Speed: ${(totalProcessed / parseFloat(totalTime)).toFixed(1)} files/second`);

    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the analysis
analyzeDataParallel();