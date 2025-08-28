import AsyncStorage from '@react-native-async-storage/async-storage';
import Safx from 'react-native-saf-x';
import { AUDIO_EXTENSIONS, VoiceItem } from '../constants/voiceNotes';
import { generateFileHash } from '../utils/audioUtils';

export const openDirectoryPicker = async (): Promise<{ uri: string } | null> => {
    try {
        const result = await Safx.openDocumentTree(true);
        if (result) {
            await AsyncStorage.setItem('whatsAppVoiceNotesUri', result.uri);
            return result;
        }
        return null;
    } catch (e) {
        console.error('Error opening directory picker:', e);
        return null;
    }
};

export const collectVoiceNotes = async (dirUri: string | null): Promise<VoiceItem[]> => {
    if (!dirUri) return [];

    const audioFiles: VoiceItem[] = [];
    const processedUris = new Set<string>();

    const traverse = async (uri: string) => {
        if (processedUris.has(uri)) return;
        processedUris.add(uri);

        try {
            const files = await Safx.listFiles(uri);

            for (const file of files) {
                if ((file as any).mime === 'vnd.android.document/directory') {
                    await traverse(file.uri);
                } else {
                    const extension = file.name.split('.').pop()?.toLowerCase();
                    if (extension && AUDIO_EXTENSIONS.includes(extension)) {
                        audioFiles.push({ path: file.uri, name: file.name });
                    }
                }
            }
        } catch (e) {
            console.error(`Error traversing ${uri}:`, e);
        }
    };

    await traverse(dirUri);
    return audioFiles;
};

export const loadVoiceNotesWithHashes = async (notes: VoiceItem[]): Promise<VoiceItem[]> => {
    return Promise.all(
        notes.map(async (item) => ({
            ...item,
            fileHash: await generateFileHash(item.path),
            duration: Math.floor(Math.random() * 120) + 10, // Mock duration
        }))
    );
};