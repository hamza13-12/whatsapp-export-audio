import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// Constants
import { GOAL, LocationData, RUPEE_RATE, VoiceItem } from '../constants/voiceNotes';

// Hooks
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useUploadQueue } from '../hooks/useUploadQueue';
import { useVoiceNotes } from '../hooks/useVoiceNotes';

// Services
import { openDirectoryPicker } from '../services/fileService';
import { getUserLocation, requestLocationPermission } from '../services/locationService';

// Components
import { EarningsCard } from '../components/voicenotes/EarningsCard';
import { EmptyState } from '../components/voicenotes/EmptyState';
import { HelpModal } from '../components/voicenotes/HelpModal';
import { ListControls } from '../components/voicenotes/ListControls';
import { OnboardingCard } from '../components/voicenotes/OnboardingCard';
import { VoiceItemComponent } from '../components/voicenotes/VoiceItem';

function VoiceNotesScreenContent() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const scrollToTopOpacity = useRef(new Animated.Value(0)).current;

  // State
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Hooks
  const {
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
  } = useVoiceNotes();

  const { playNote, playingPath } = useAudioPlayer();

  const {
    uploaded,
    setUploaded,
    uploadingFiles,
    addToUploadQueue,
    uploadQueueRef,
  } = useUploadQueue(voiceNotes, userLocation);

  // Check if first time user
  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then((value) => {
      if (!value && !dirUri) {
        setShowOnboarding(true);
        AsyncStorage.setItem('hasSeenOnboarding', 'true');
      }
    });
  }, [dirUri]);

  // Request location permission and get user location
  const initializeLocation = useCallback(async () => {
    const granted = await requestLocationPermission();
    setLocationPermissionGranted(granted);
    if (granted) {
      const location = await getUserLocation();
      setUserLocation(location);
    }
  }, []);

  // Handle directory picker
  const handleOpenDirectory = useCallback(async () => {
    const result = await openDirectoryPicker();
    if (result) {
      setDirUri(result.uri);
      const uploadedPaths = await requestAndLoad(result.uri);
      if (uploadedPaths) {
        setUploaded(uploadedPaths);
      }
      setShowOnboarding(false);
    } else {
      Alert.alert('Error', 'Could not open directory picker.');
    }
  }, [requestAndLoad, setDirUri, setUploaded]);

  // Scroll handling
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const shouldShow = offsetY > 200;

    if (shouldShow !== showScrollToTop) {
      setShowScrollToTop(shouldShow);
      Animated.timing(scrollToTopOpacity, {
        toValue: shouldShow ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showScrollToTop, scrollToTopOpacity]);

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Handle upload
  const handleUpload = useCallback(() => {
    if (selectedCount === 0) {
      Alert.alert('No Selection', 'Please select voice notes to upload.');
      return;
    }

    const toUpload = voiceNotes.filter((v) =>
      selectedNotesRef.current.has(v.path) &&
      !uploaded.has(v.path) &&
      !uploadingFiles.has(v.path) &&
      !uploadQueueRef.current.includes(v.path)
    );

    if (toUpload.length === 0) {
      Alert.alert('Already Processing', 'The selected notes are already uploaded or uploading.');
      return;
    }

    addToUploadQueue(toUpload.map(v => v.path));
    clearSelection();
  }, [selectedCount, voiceNotes, uploaded, uploadingFiles, uploadQueueRef, selectedNotesRef, addToUploadQueue, clearSelection]);

  // Initialize on focus
  useFocusEffect(
    useCallback(() => {
      (async () => {
        await initializeLocation();

        const storedUri = await AsyncStorage.getItem('whatsAppVoiceNotesUri');

        if (storedUri) {
          setDirUri(storedUri);
          const uploadedPaths = await requestAndLoad(storedUri);
          if (uploadedPaths) {
            setUploaded(uploadedPaths);
          }
        }
      })();
    }, [initializeLocation, requestAndLoad, setDirUri, setUploaded])
  );

  // Render item
  const renderItem: ListRenderItem<VoiceItem> = useCallback(({ item }) => {
    const isUploaded = uploaded.has(item.path);
    const isPlaying = playingPath === item.path;
    const isSelected = selectedItems.has(item.path);
    const isUploading = uploadingFiles.has(item.path);

    return (
      <VoiceItemComponent
        item={item}
        isUploaded={isUploaded}
        isPlaying={isPlaying}
        isSelected={isSelected}
        isUploading={isUploading}
        onToggleSelection={toggleSelection}
        onPlayNote={playNote}
        RUPEE_RATE={RUPEE_RATE}
      />
    );
  }, [uploaded, playingPath, uploadingFiles, selectedItems, toggleSelection, playNote]);

  // Calculate stats
  const progress = Math.min((uploaded.size * RUPEE_RATE) / GOAL, 1);
  const totalEarned = Math.floor(uploaded.size * RUPEE_RATE);
  const uploadingCount = uploadingFiles.size;
  const availableCount = voiceNotes.filter(v =>
    !uploaded.has(v.path) &&
    !uploadingFiles.has(v.path)
  ).length;
  const potentialEarnings = Math.floor(availableCount * RUPEE_RATE);

  // List header component
  const ListHeaderComponent = useCallback(() => (
    <>
      <EarningsCard
        totalEarned={totalEarned}
        progress={progress}
        uploadingCount={uploadingCount}
        availableCount={availableCount}
        uploadedCount={uploaded.size}
        potentialEarnings={potentialEarnings}
      />

      {showOnboarding && (
        <OnboardingCard onSelectFolder={handleOpenDirectory} />
      )}

      {voiceNotes.length > 0 && (
        <ListControls
          selectedCount={selectedCount}
          onSelectAll={() => selectAll(uploaded, uploadingFiles)}
          onClearSelection={clearSelection}
        />
      )}
    </>
  ), [
    totalEarned,
    progress,
    uploadingCount,
    availableCount,
    uploaded,
    potentialEarnings,
    showOnboarding,
    voiceNotes.length,
    selectedCount,
    selectAll,
    clearSelection,
    handleOpenDirectory,
    uploadingFiles,
  ]);

  const keyExtractor = useCallback((item: VoiceItem) => item.path, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.statusBar, { height: insets.top }]} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.appLogo}>
            <Ionicons name="logo-whatsapp" size={28} color="white" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Voice Notes Earner</Text>
            <Text style={styles.headerSubtitle}>
              {checkingUploads ? 'Syncing...' : `Earn ${RUPEE_RATE} per note`}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.helpButton}
            onPress={() => setShowHelp(true)}
          >
            <Ionicons name="help-circle-outline" size={24} color="#667781" />
          </Pressable>
          {dirUri && (
            <Pressable
              style={styles.menuButton}
              onPress={handleOpenDirectory}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#667781" />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={styles.loadingText}>Finding voice notes...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={voiceNotes}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: selectedCount > 0 ? 120 + insets.bottom : 20 + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={
            <EmptyState
              dirUri={dirUri}
              showOnboarding={showOnboarding}
              onSelectFolder={handleOpenDirectory}
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={10}
          initialNumToRender={10}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(data, index) => ({
            length: 80,
            offset: 80 * index,
            index,
          })}
          extraData={[selectedItems, uploaded, uploadingFiles, playingPath]}
        />
      )}

      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} />

      {selectedCount > 0 && (
        <Animated.View
          style={[
            styles.uploadBar,
            { paddingBottom: Math.max(20, insets.bottom) }
          ]}
        >
          <View style={styles.uploadInfo}>
            <Text style={styles.selectedCountText}>
              {selectedCount} selected
            </Text>
            <Text style={styles.potentialEarningText}>
              Earn {Math.floor(selectedCount * RUPEE_RATE)}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.uploadButton,
              pressed && styles.uploadButtonPressed,
            ]}
            onPress={handleUpload}
          >
            <Ionicons name="cloud-upload" size={20} color="white" />
            <Text style={styles.uploadButtonText}>Upload</Text>
          </Pressable>
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.fabButton,
          {
            opacity: scrollToTopOpacity,
            transform: [{
              scale: scrollToTopOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              })
            }],
            bottom: selectedCount > 0 ? 140 + insets.bottom : 80 + insets.bottom,
          }
        ]}
        pointerEvents={showScrollToTop ? 'auto' : 'none'}
      >
        <Pressable
          onPress={scrollToTop}
          style={({ pressed }) => [
            styles.fabInner,
            pressed && styles.fabPressed
          ]}
        >
          <Ionicons name="arrow-up" size={24} color="white" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default function VoiceNotesScreen() {
  return (
    <SafeAreaProvider>
      <VoiceNotesScreenContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#008069',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#008069',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appLogo: {
    width: 44,
    height: 44,
    backgroundColor: '#25D366',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  helpButton: {
    padding: 4,
  },
  menuButton: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 100,
  },
  uploadBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9EDEF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  uploadInfo: {
    flex: 1,
  },
  selectedCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  potentialEarningText: {
    fontSize: 14,
    color: '#667781',
    marginTop: 2,
  },
  uploadButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  uploadButtonPressed: {
    backgroundColor: '#1EAE5A',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#667781',
    marginTop: 12,
  },
  fabButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabPressed: {
    backgroundColor: '#1EAE5A',
    transform: [{ scale: 0.95 }],
  },
});