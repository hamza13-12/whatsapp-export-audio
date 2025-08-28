import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface EmptyStateProps {
    dirUri: string | null;
    showOnboarding: boolean;
    onSelectFolder: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    dirUri,
    showOnboarding,
    onSelectFolder,
}) => {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
                <Ionicons name="mic-outline" size={64} color="#E9EDEF" />
            </View>
            <Text style={styles.emptyTitle}>No voice notes yet</Text>
            <Text style={styles.emptyText}>
                {dirUri
                    ? "Record some voice notes in WhatsApp and they'll appear here"
                    : showOnboarding
                        ? "Follow the instructions above to get started"
                        : "Select your WhatsApp folder to get started"}
            </Text>
            {!dirUri && !showOnboarding && (
                <Pressable style={styles.emptyButton} onPress={onSelectFolder}>
                    <Text style={styles.emptyButtonText}>Select Folder</Text>
                </Pressable>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 100,
        paddingBottom: 100,
    },
    emptyIllustration: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F0F2F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#667781',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    emptyButton: {
        backgroundColor: '#25D366',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    emptyButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
});