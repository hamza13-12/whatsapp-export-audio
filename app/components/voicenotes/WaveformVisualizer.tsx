import React, { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface WaveformVisualizerProps {
    isPlaying: boolean;
    isSelected: boolean;
    isUploaded: boolean;
    isUploading: boolean;
    progress?: number;
}

export const WaveformVisualizer = memo(({
    isPlaying,
    isSelected,
    isUploaded,
    isUploading,
    progress = 0
}: WaveformVisualizerProps) => {
    const bars = 15;
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isPlaying) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(animatedValue, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(animatedValue, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            animatedValue.setValue(0);
        }
    }, [isPlaying, animatedValue]);

    return (
        <View style={styles.waveformContainer}>
            {Array.from({ length: bars }, (_, i) => {
                const baseHeight = Math.sin((i / bars) * Math.PI) * 20 + 10;
                const scaleY = animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.5],
                });

                return (
                    <Animated.View
                        key={i}
                        style={[
                            styles.waveformBar,
                            {
                                height: baseHeight,
                                backgroundColor: isUploaded ? '#D4D4D4' :
                                    isUploading ? '#25D366' :
                                        isSelected ? '#25D366' :
                                            isPlaying ? '#25D366' : '#B8B8B8',
                                opacity: isUploaded ? 0.5 : 1,
                                transform: isPlaying ? [{ scaleY }] : [],
                            },
                        ]}
                    />
                );
            })}
            {isUploading && (
                <View style={[styles.uploadingOverlay, { width: `${progress}%` }]} />
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        height: 40,
    },
    waveformBar: {
        width: 3,
        backgroundColor: '#B8B8B8',
        borderRadius: 2,
    },
    uploadingOverlay: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(37, 211, 102, 0.2)',
        borderRadius: 4,
    },
});