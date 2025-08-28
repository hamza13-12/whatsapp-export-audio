import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface HelpModalProps {
    visible: boolean;
    onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ visible, onClose }) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>How to Earn Money</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#667781" />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.modalScroll}>
                        <View style={styles.helpStep}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>1</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Select WhatsApp Folder</Text>
                                <Text style={styles.stepDescription}>
                                    Choose your WhatsApp Voice Notes folder to access all your voice messages
                                </Text>
                            </View>
                        </View>

                        <View style={styles.helpStep}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>2</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Select Voice Notes</Text>
                                <Text style={styles.stepDescription}>
                                    Tap to select multiple notes or use "Select All" for bulk selection
                                </Text>
                            </View>
                        </View>

                        <View style={styles.helpStep}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>3</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Upload & Earn</Text>
                                <Text style={styles.stepDescription}>
                                    Upload selected notes to earn 0.25 per voice note instantly
                                </Text>
                            </View>
                        </View>

                        <View style={styles.tipBox}>
                            <Ionicons name="bulb-outline" size={20} color="#25D366" />
                            <Text style={styles.tipText}>
                                Tip: Long press any voice note to preview it before uploading
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E9EDEF',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
    },
    closeButton: {
        padding: 4,
    },
    modalScroll: {
        padding: 20,
    },
    helpStep: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#25D366',
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    stepDescription: {
        fontSize: 14,
        color: '#667781',
        lineHeight: 20,
    },
    tipBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#E8F5E9',
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        color: '#1F2937',
        lineHeight: 20,
    },
});