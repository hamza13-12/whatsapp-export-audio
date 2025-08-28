import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import Safx from 'react-native-saf-x';

export const generateFileHash = async (filePath: string): Promise<string> => {
    try {
        const base64Content = await Safx.readFile(filePath, { encoding: 'base64' });
        const hash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            base64Content,
            { encoding: Crypto.CryptoEncoding.HEX }
        );
        return hash;
    } catch (error) {
        console.error('Error generating file hash:', error);
        return '';
    }
};

export const getUserId = async (): Promise<string> => {
    let userId = await AsyncStorage.getItem('userId');
    if (!userId) {
        userId = await Application.getAndroidId() || `anonymous-${Date.now()}-${Math.random()}`;
        await AsyncStorage.setItem('userId', userId);
    }
    return userId;
};