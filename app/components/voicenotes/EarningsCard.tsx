import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { GOAL } from '../../constants/voiceNotes';

interface EarningsCardProps {
    totalEarned: number;
    progress: number;
    uploadingCount: number;
    availableCount: number;
    uploadedCount: number;
    potentialEarnings: number;
}

export const EarningsCard: React.FC<EarningsCardProps> = ({
    totalEarned,
    progress,
    uploadingCount,
    availableCount,
    uploadedCount,
    potentialEarnings,
}) => {
    return (
        <View style={styles.earningsCard}>
            <View style={styles.earningsHeader}>
                <Text style={styles.earningsTitle}>Your Earnings</Text>
                <View style={styles.earningsAmount}>
                    <Text style={styles.earningsValue}>{totalEarned}</Text>
                </View>
            </View>

            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width: `${progress * 100}%`,
                            }
                        ]}
                    />
                </View>
                <View style={styles.progressLabels}>
                    <Text style={styles.progressText}>
                        {Math.round(progress * 100)}% of {GOAL} goal
                    </Text>
                    {uploadingCount > 0 && (
                        <Text style={styles.uploadingText}>
                            {uploadingCount} uploading...
                        </Text>
                    )}
                </View>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{availableCount}</Text>
                    <Text style={styles.statLabel}>Available</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, styles.uploadedStat]}>{uploadedCount}</Text>
                    <Text style={styles.statLabel}>Uploaded</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, styles.potentialStat]}>{potentialEarnings}</Text>
                    <Text style={styles.statLabel}>Potential</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    earningsCard: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        borderRadius: 12,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    earningsHeader: {
        marginBottom: 16,
    },
    earningsTitle: {
        fontSize: 14,
        color: '#667781',
        marginBottom: 4,
    },
    earningsAmount: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    earningsValue: {
        fontSize: 36,
        fontWeight: '700',
        color: '#25D366',
    },
    progressContainer: {
        marginBottom: 20,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#E9EDEF',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#25D366',
        borderRadius: 4,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressText: {
        fontSize: 12,
        color: '#667781',
    },
    uploadingText: {
        fontSize: 12,
        color: '#667781',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#667781',
    },
    uploadedStat: {
        color: '#25D366',
    },
    potentialStat: {
        color: '#F59E0B',
    },
});