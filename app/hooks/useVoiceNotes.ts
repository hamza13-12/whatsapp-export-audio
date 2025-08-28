import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { VoiceItem } from '../constants/voiceNotes';
import { checkServerUploads } from '../services/api';
import { collectVoiceNotes, loadVoiceNotesWithHashes } from '../services/fileService';
import { getUserId } from '../utils/audioUtils';

export const useVoiceNotes = () => {
    const [loading, setLoading] = useState(false);
    const [voiceNotes, setVoiceNotes] = useState<VoiceItem[]>([]);
    const [dirUri, setDirUri] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string>('');
    const [checkingUploads, setCheckingUploads] = useState(false);

    const selectedNotesRef = useRef<Set<string>>(new Set());
    const [selectedCount, setSelectedCount] = useState(0);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const checkUploads = useCallback(async (notes?: VoiceItem[]) => {
        setCheckingUploads(true);
        try {
            const userId = await getUserId();
            const notesToCheck = notes || voiceNotes;

            // Get file hashes for all voice notes
            const fileHashes = notesToCheck
                .map(note => note.fileHash)
                .filter(hash => hash) as string[];

            console.log(`Checking ${fileHashes.length} file hashes with server...`);

            const { uploadedHashes, uploadedCount } = await checkServerUploads(userId, fileHashes);
            console.log(`Server returned ${uploadedCount} uploaded files`);

            const uploadedSet = new Set<string>(uploadedHashes);

            // Return uploaded paths based on file hashes
            const uploadedPaths = new Set<string>();
            for (const note of notesToCheck) {
                if (note.fileHash && uploadedSet.has(note.fileHash)) {
                    uploadedPaths.add(note.path);
                }
            }

            console.log(`Marking ${uploadedPaths.size} files as uploaded in UI`);
            await AsyncStorage.setItem('uploadedAudios', JSON.stringify(Array.from(uploadedPaths)));

            return uploadedPaths;
        } catch (error) {
            console.error('Error checking server uploads:', error);
            return new Set<string>();
        } finally {
            setCheckingUploads(false);
        }
    }, [voiceNotes]);

    const requestAndLoad = useCallback(async (uri?: string) => {
        setLoading(true);

        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Cannot access media without permission.');
            setLoading(false);
            return;
        }

        try {
            const targetUri = uri || dirUri;
            const items = await collectVoiceNotes(targetUri);

            if (!items.length) {
                setDebugInfo('No voice notes found. Please select the WhatsApp Voice Notes folder.');
            } else {
                // Generate file hashes for all items
                const itemsWithHashes = await loadVoiceNotesWithHashes(items);

                const sortedNotes = itemsWithHashes.sort((a, b) => b.name.localeCompare(a.name));
                setVoiceNotes(sortedNotes);
                setDebugInfo(`Found ${items.length} voice notes.`);

                // Check server uploads and return the result
                return await checkUploads(sortedNotes);
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not read WhatsApp folder');
        } finally {
            setLoading(false);
        }
    }, [dirUri, checkUploads]);

    const toggleSelection = useCallback((path: string) => {
        if (selectedNotesRef.current.has(path)) {
            selectedNotesRef.current.delete(path);
        } else {
            selectedNotesRef.current.add(path);
        }
        setSelectedCount(selectedNotesRef.current.size);
        setSelectedItems(new Set(selectedNotesRef.current));
    }, []);

    const selectAll = useCallback((uploaded: Set<string>, uploadingFiles: Set<string>) => {
        const availableNotes = voiceNotes.filter(v =>
            !uploaded.has(v.path) &&
            !uploadingFiles.has(v.path)
        );
        selectedNotesRef.current = new Set(availableNotes.map(v => v.path));
        setSelectedCount(selectedNotesRef.current.size);
        setSelectedItems(new Set(selectedNotesRef.current));
    }, [voiceNotes]);

    const clearSelection = useCallback(() => {
        selectedNotesRef.current.clear();
        setSelectedCount(0);
        setSelectedItems(new Set());
    }, []);

    return {
        loading,
        voiceNotes,
        dirUri,
        setDirUri,
        debugInfo,
        checkingUploads,
        selectedNotesRef,
        selectedCount,
        selectedItems,
        requestAndLoad,
        toggleSelection,
        selectAll,
        clearSelection,
    };
};