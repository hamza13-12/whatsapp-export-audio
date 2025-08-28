import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

export default function PayoutScreen() {
  const router = useRouter();
  const [totalEarned, setTotalEarned] = useState(0);
  const phoneNumber = '0329-123-5888';

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    const stored = await AsyncStorage.getItem('uploadedAudios');
    if (stored) {
      const uploaded = JSON.parse(stored);
      setTotalEarned(uploaded.length); // Rs 1 per audio
    }
  };

  const copyNumber = async () => {
    await Clipboard.setStringAsync(phoneNumber);
    Alert.alert('Copied!', 'Phone number copied to clipboard');
  };

  const openWhatsApp = async () => {
    const phoneNumberClean = phoneNumber.replace(/-/g, ''); // Remove dashes
    const message = `Hi! I've earned Rs ${totalEarned} from Voice Notes Earner app. Please process my payout. Thank you!`;
    const url = `whatsapp://send?phone=92${phoneNumberClean}&text=${encodeURIComponent(message)}`;
    
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp not installed', 'Please install WhatsApp to send the message directly.');
    }
  };

  const shareInstructions = async () => {
    try {
      await Share.share({
        message: `I've earned Rs ${totalEarned} from Voice Notes Earner app! Payment requested via WhatsApp to ${phoneNumber}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        {/* Custom Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>Get Your Payout</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Success Animation Container */}
        <View style={styles.successContainer}>
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.iconContainer}
          >
            <Ionicons name="checkmark-circle" size={80} color="white" />
          </LinearGradient>
          
          <Text style={styles.congratsText}>Congratulations!</Text>
          <Text style={styles.earningsAmount}>You've earned</Text>
          
          <View style={styles.amountContainer}>
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              style={styles.amountGradient}
            >
              <Text style={styles.currency}>Rs</Text>
              <Text style={styles.amount}>{totalEarned}</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Instructions Card */}
        <View style={styles.instructionsCard}>
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepText}>1</Text>
            </View>
            <Text style={styles.instructionText}>Take a screenshot of this page</Text>
          </View>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepText}>2</Text>
            </View>
            <Text style={styles.instructionText}>Send it via WhatsApp to</Text>
          </View>

          <Pressable onPress={openWhatsApp} style={styles.phoneContainer}>
            <LinearGradient
              colors={['#10b98130', '#05966930']}
              style={styles.phoneGradient}
            >
              <Ionicons name="logo-whatsapp" size={32} color="#10b981" />
              <Text style={styles.phoneNumber}>{phoneNumber}</Text>
              <Ionicons name="arrow-forward" size={20} color="#10b981" />
            </LinearGradient>
          </Pressable>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepText}>3</Text>
            </View>
            <Text style={styles.instructionText}>Receive payment within 24 hours</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <Pressable onPress={openWhatsApp} style={styles.shareButton}>
            <LinearGradient
              colors={['#25d366', '#128c7e']}
              style={styles.buttonGradient}
            >
              <Ionicons name="logo-whatsapp" size={24} color="white" />
              <Text style={styles.buttonText}>Open WhatsApp</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={shareInstructions} style={styles.secondaryButton}>
            <Ionicons name="share-social" size={20} color="#8b5cf6" />
            <Text style={styles.secondaryButtonText}>Share Details</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.backToAppButton}>
            <Text style={styles.backButtonText}>Back to App</Text>
          </Pressable>
        </View>

        {/* Trust Indicators */}
        <View style={styles.trustContainer}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={20} color="#10b981" />
            <Text style={styles.trustText}>Secure Payment</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="time" size={20} color="#10b981" />
            <Text style={styles.trustText}>Fast Processing</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  congratsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  amountContainer: {
    marginBottom: 20,
  },
  amountGradient: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  currency: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  amount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  instructionsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139,92,246,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    color: '#8b5cf6',
    fontWeight: 'bold',
    fontSize: 16,
  },
  instructionText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  phoneContainer: {
    marginVertical: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  phoneGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  phoneNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    marginTop: 32,
    gap: 12,
  },
  shareButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#25d366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  backToAppButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  trustContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginTop: 32,
    paddingBottom: 32,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});