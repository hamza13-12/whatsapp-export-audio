import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ListControlsProps {
    selectedCount: number;
    onSelectAll: () => void;
    onClearSelection: () => void;
}

export const ListControls: React.FC<ListControlsProps> = ({
    selectedCount,
    onSelectAll,
    onClearSelection,
}) => {
    return (
        <View style={styles.listControls}>
            <Text style={styles.sectionTitle}>Voice Notes</Text>
            <View style={styles.selectionButtons}>
                <Pressable
                    style={styles.selectAllButton}
                    onPress={onSelectAll}
                >
                    <Text style={styles.selectAllText}>Select All</Text>
                </Pressable>
                {selectedCount > 0 && (
                    <Pressable
                        style={styles.clearButton}
                        onPress={onClearSelection}
                    >
                        <Text style={styles.clearText}>Clear ({selectedCount})</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    listControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    selectionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    selectAllButton: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
    },
    selectAllText: {
        color: '#25D366',
        fontSize: 14,
        fontWeight: '500',
    },
    clearButton: {
        backgroundColor: '#F0F2F5',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
    },
    clearText: {
        color: '#667781',
        fontSize: 14,
        fontWeight: '500',
    },
});