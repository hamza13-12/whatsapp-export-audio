import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { LocationData } from '../constants/voiceNotes';

export const requestLocationPermission = async (): Promise<boolean> => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error requesting location permission:', error);
        return false;
    }
};

export const getUserLocation = async (): Promise<LocationData | null> => {
    try {
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });

        let locationDetails: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: new Date().toISOString(),
        };

        try {
            const reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (reverseGeocode.length > 0) {
                const details = reverseGeocode[0];
                locationDetails = {
                    ...locationDetails,
                    city: details.city || details.district || undefined,
                    region: details.region || undefined,
                    country: details.country || undefined,
                };
            }
        } catch (geoError) {
            console.log('Reverse geocoding failed, using coordinates only');
        }

        await AsyncStorage.setItem('userLocation', JSON.stringify(locationDetails));
        return locationDetails;
    } catch (error) {
        console.error('Error getting location:', error);
        const storedLocation = await AsyncStorage.getItem('userLocation');
        if (storedLocation) {
            return JSON.parse(storedLocation);
        }
        return null;
    }
};