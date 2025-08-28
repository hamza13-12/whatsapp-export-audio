import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import Safx from 'react-native-saf-x';
import { VoiceItem } from '../constants/voiceNotes';

export const useAudioPlayer = () => {
    const [soundObj, setSoundObj] = useState<Audio.Sound | null>(null);
    const [tempAudioUri, setTempAudioUri] = useState<string | null>(null);
    const [playingPath, setPlayingPath] = useState<string | null>(null);

    const cleanup = useCallback(async () => {
        if (soundObj) {
            await soundObj.unloadAsync();
            setSoundObj(null);
        }
        if (tempAudioUri) {
            await FileSystem.deleteAsync(tempAudioUri, { idempotent: true });
            setTempAudioUri(null);
        }
    }, [soundObj, tempAudioUri]);

    const playNote = useCallback(async (item: VoiceItem) => {
        // Clean up existing audio
        await cleanup();

        // If same note is playing, stop it
        if (playingPath === item.path) {
            setPlayingPath(null);
            return;
        }

        try {
            let playableUri = item.path;
            let newTempUri: string | null = null;

            // Handle content:// URIs
            if (item.path.startsWith('content://')) {
                const tempDir = (FileSystem.cacheDirectory || '') + 'voicenotes/';
                await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
                const tempFileName = `${new Date().getTime()}-${item.name}`;
                newTempUri = tempDir + tempFileName;

                const base64Content = await Safx.readFile(item.path, { encoding: 'base64' });
                await FileSystem.writeAsStringAsync(newTempUri, base64Content, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                playableUri = newTempUri;
            }

            const { sound } = await Audio.Sound.createAsync({ uri: playableUri });

            setSoundObj(sound);
            setTempAudioUri(newTempUri);
            setPlayingPath(item.path);

            sound.setOnPlaybackStatusUpdate(async (status) => {
                if (status.isLoaded && status.didJustFinish) {
                    await sound.unloadAsync();
                    setSoundObj(null);
                    setPlayingPath(null);
                    if (newTempUri) {
                        await FileSystem.deleteAsync(newTempUri, { idempotent: true });
                        setTempAudioUri(null);
                    }
                }
            });

            await sound.playAsync();

        } catch (e) {
            Alert.alert('Playback error', 'Could not play this voice note.');
            await cleanup();
            setPlayingPath(null);
        }
    }, [playingPath, cleanup]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return {
        playNote,
        playingPath,
        cleanup,
    };
};