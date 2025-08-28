import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { VoiceItem } from '../../constants/voiceNotes';
import { formatDuration } from '../../utils/formatters';
import { WaveformVisualizer } from './WaveformVisualizer';

interface VoiceItemComponentProps {
    item: VoiceItem;
    isUploaded: boolean;
    isPlaying: boolean;
    isSelected: boolean;
    isUploading: boolean;
    onToggleSelection: (path: string) => void;
    onPlayNote: (item: VoiceItem) => void;
    RUPEE_RATE: number;
}

export const VoiceItemComponent = memo(({
    item,
    isUploaded,
    isPlaying,
    isSelected,
    isUploading,
    onToggleSelection,
    onPlayNote,
    RUPEE_RATE
}: VoiceItemComponentProps) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
        }).start();
    }, [scaleAnim]);

    const handlePressOut = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
        }).start();
    }, [scaleAnim]);

    const handlePress = useCallback(() => {
        if (!isUploaded && !isUploading) {
            onToggleSelection(item.path);
        }
    }, [isUploaded, isUploading, onToggleSelection, item.path]);

    const handleLongPress = useCallback(() => {
        if (!isUploaded && !isUploading) {
            onPlayNote(item);
        }
    }, [isUploaded, isUploading, onPlayNote, item]);

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
                style={[
                    styles.voiceItem,
                    isSelected && styles.selectedItem,
                    isUploaded && styles.uploadedItem,
                ]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePress}
                onLongPress={handleLongPress}
                disabled={isUploaded || isUploading}
            >
                <View style={[
                    styles.selectionCircle,
                    isSelected && styles.selectedCircle,
                    isUploaded && styles.uploadedCircle,
                ]}>
                    {(isSelected || isUploaded) && (
                        <Ionicons
                            name="checkmark"
                            size={14}
                            color="white"
                        />
                    )}
                </View>

                <View style={styles.waveformWrapper}>
                    <WaveformVisualizer
                        isPlaying={isPlaying}
                        isSelected={isSelected}
                        isUploaded={isUploaded}
                        isUploading={isUploading}
                    />
                    {isPlaying && (
                        <View style={styles.playingIndicator}>
                            <Ionicons name="pause" size={20} color="#25D366" />
                        </View>
                    )}
                </View>

                <Text style={[
                    styles.duration,
                    isUploaded && styles.uploadedDuration,
                ]}>
                    {formatDuration(item.duration || 34)}
                </Text>

                <View style={styles.earningBadge}>
                    <Text style={[
                        styles.earningText,
                        isUploaded && styles.earnedText,
                        isUploading && styles.uploadingText,
                    ]}>
                        {isUploaded ? '✓ Earned' :
                            isUploading ? 'Uploading...' :
                                `+${RUPEE_RATE}`}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.item.path === nextProps.item.path &&
        prevProps.isUploaded === nextProps.isUploaded &&
        prevProps.isPlaying === nextProps.isPlaying &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isUploading === nextProps.isUploading &&
        prevProps.RUPEE_RATE === nextProps.RUPEE_RATE
    );
});

const styles = StyleSheet.create({
    voiceItem: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 1,
    },
    selectedItem: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#25D366',
    },
    uploadedItem: {
        opacity: 0.6,
    },
    selectionCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D4D4D4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedCircle: {
        backgroundColor: '#25D366',
        borderColor: '#25D366',
    },
    uploadedCircle: {
        backgroundColor: '#D4D4D4',
        borderColor: '#D4D4D4',
    },
    waveformWrapper: {
        flex: 1,
        height: 40,
        justifyContent: 'center',
        position: 'relative',
    },
    playingIndicator: {
        position: 'absolute',
        left: '50%',
        marginLeft: -12,
    },
    duration: {
        fontSize: 12,
        color: '#667781',
        minWidth: 40,
    },
    uploadedDuration: {
        color: '#B8B8B8',
    },
    earningBadge: {
        backgroundColor: '#F0F2F5',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    earningText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F59E0B',
    },
    earnedText: {
        color: '#25D366',
    },
    uploadingText: {
        color: '#667781',
        fontSize: 12,
    },
});