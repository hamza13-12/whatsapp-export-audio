import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface OnboardingCardProps {
    onSelectFolder: () => void;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({ onSelectFolder }) => {
    return (
        <View style={styles.onboardingCard}>
            <Ionicons name="hand-left-outline" size={32} color="#25D366" />
            <Text style={styles.onboardingTitle}>Welcome! Let's get started</Text>
            <Text style={styles.onboardingText}>
                Select your WhatsApp Voice Notes folder to begin earning money
            </Text>
            <Pressable style={styles.selectFolderButton} onPress={onSelectFolder}>
                <Ionicons name="folder-outline" size={20} color="white" />
                <Text style={styles.selectFolderText}>Select WhatsApp Folder</Text>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    onboardingCard: {
        backgroundColor: '#E8F5E9',
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
    },
    onboardingTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 12,
        marginBottom: 8,
    },
    onboardingText: {
        fontSize: 14,
        color: '#667781',
        textAlign: 'center',
        marginBottom: 16,
    },
    selectFolderButton: {
        backgroundColor: '#25D366',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
    },
    selectFolderText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
});