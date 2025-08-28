import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useRef, useState } from 'react';
import {
    CONCURRENT_UPLOADS,
    LocationData,
    MAX_RETRY_ATTEMPTS,
    RETRY_DELAY_BASE,
    RetryInfo,
    VoiceItem
} from '../constants/voiceNotes';
import { uploadFile } from '../services/api';

export const useUploadQueue = (
    voiceNotes: VoiceItem[],
    userLocation: LocationData | null
) => {
    const [uploaded, setUploaded] = useState<Set<string>>(new Set());
    const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

    const uploadQueueRef = useRef<string[]>([]);
    const activeUploadsRef = useRef<Map<string, Promise<void>>>(new Map());
    const isProcessingRef = useRef<boolean>(false);
    const retryInfoRef = useRef<Map<string, RetryInfo>>(new Map());

    const processUploadQueue = useCallback(async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        console.log('Starting upload processor with retry logic...');

        try {
            while (uploadQueueRef.current.length > 0 || activeUploadsRef.current.size > 0) {
                // Fill up to CONCURRENT_UPLOADS
                while (activeUploadsRef.current.size < CONCURRENT_UPLOADS && uploadQueueRef.current.length > 0) {
                    const filePath = uploadQueueRef.current.shift()!;

                    // Get or initialize retry info
                    let retryInfo = retryInfoRef.current.get(filePath);
                    if (!retryInfo) {
                        retryInfo = { attempts: 0, lastAttempt: Date.now() };
                        retryInfoRef.current.set(filePath, retryInfo);
                    }

                    // Check if we should wait before retrying
                    const timeSinceLastAttempt = Date.now() - retryInfo.lastAttempt;
                    const requiredDelay = RETRY_DELAY_BASE * Math.pow(2, retryInfo.attempts - 1);

                    if (retryInfo.attempts > 0 && timeSinceLastAttempt < requiredDelay) {
                        // Put back in queue to retry later
                        uploadQueueRef.current.push(filePath);
                        console.log(`Delaying retry for ${filePath} (attempt ${retryInfo.attempts + 1}/${MAX_RETRY_ATTEMPTS})`);
                        continue;
                    }

                    console.log(`Starting upload for: ${filePath} (attempt ${retryInfo.attempts + 1}/${MAX_RETRY_ATTEMPTS})`);

                    // Mark as uploading
                    setUploadingFiles(prev => new Set(prev).add(filePath));

                    // Find the file in voiceNotes
                    const file = voiceNotes.find(v => v.path === filePath);
                    if (!file || !file.fileHash) continue;

                    // Create upload promise
                    const uploadPromise = uploadFile(filePath, file.name, file.fileHash, userLocation)
                        .then((success) => {
                            if (success) {
                                console.log(`Upload successful: ${filePath}`);
                                // Clear retry info on success
                                retryInfoRef.current.delete(filePath);
                                setUploaded(prev => {
                                    const newSet = new Set(prev);
                                    newSet.add(filePath);
                                    // Save to AsyncStorage
                                    AsyncStorage.setItem('uploadedAudios', JSON.stringify(Array.from(newSet)));
                                    return newSet;
                                });
                            } else {
                                // Update retry info
                                retryInfo!.attempts += 1;
                                retryInfo!.lastAttempt = Date.now();

                                if (retryInfo!.attempts < MAX_RETRY_ATTEMPTS) {
                                    console.log(`Upload failed: ${filePath}. Will retry (${retryInfo!.attempts}/${MAX_RETRY_ATTEMPTS})`);
                                    // Add back to queue for retry
                                    uploadQueueRef.current.push(filePath);
                                } else {
                                    console.log(`Upload failed after ${MAX_RETRY_ATTEMPTS} attempts: ${filePath}`);
                                    // Clear retry info after max attempts
                                    retryInfoRef.current.delete(filePath);
                                }
                            }
                        })
                        .catch((error) => {
                            console.error(`Upload error for ${filePath}:`, error);
                            // Treat errors same as failures - retry if attempts remaining
                            retryInfo!.attempts += 1;
                            retryInfo!.lastAttempt = Date.now();

                            if (retryInfo!.attempts < MAX_RETRY_ATTEMPTS) {
                                uploadQueueRef.current.push(filePath);
                            } else {
                                retryInfoRef.current.delete(filePath);
                            }
                        })
                        .finally(() => {
                            activeUploadsRef.current.delete(filePath);
                            setUploadingFiles(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(filePath);
                                return newSet;
                            });
                            console.log(`Active uploads: ${activeUploadsRef.current.size}, Queue: ${uploadQueueRef.current.length}`);
                        });

                    activeUploadsRef.current.set(filePath, uploadPromise);
                }

                // Wait for at least one upload to complete
                if (activeUploadsRef.current.size > 0) {
                    await Promise.race(activeUploadsRef.current.values());
                } else if (uploadQueueRef.current.length > 0) {
                    // If queue has items but we're not processing them (due to retry delays), 
                    // wait a bit before checking again
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            console.log('Upload processor finished - queue empty');
        } catch (error) {
            console.error('Upload processor error:', error);
        } finally {
            isProcessingRef.current = false;
        }
    }, [voiceNotes, userLocation]);

    const addToUploadQueue = useCallback((paths: string[]) => {
        uploadQueueRef.current.push(...paths);
        if (!isProcessingRef.current) {
            processUploadQueue();
        }
    }, [processUploadQueue]);

    return {
        uploaded,
        setUploaded,
        uploadingFiles,
        addToUploadQueue,
        uploadQueueRef,
    };
};