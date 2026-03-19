import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Image, StatusBar, Dimensions } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { GoogleAuthProvider } from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoadingScreen from './loadinScreen';
const API_BASE = '/api';
const { width } = Dimensions.get('window');

const LoginScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
      profileImageSize: 120,
    });
    
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        const currentUser = await GoogleSignin.getCurrentUser();
        console.log('Already signed in user:', currentUser);
      }
    } catch (error) {
      console.log('No user currently signed in');
    }
  };

  const clearError = () => setError(null);

  const onGoogleButtonPress = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Step 1: Checking Google Play Services...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      console.log('Step 2: Starting Google Sign-In...');
      const result = await GoogleSignin.signIn();
      console.log('Google Sign-In Result:', result);
      
      if (!result.idToken) {
        console.log('No ID token in result, trying to get tokens...');
        try {
          const tokens = await GoogleSignin.getTokens();
          console.log('Tokens received:', tokens);
          if (tokens && tokens.idToken) {
            console.log('ID Token found in getTokens()');
            await completeAuthentication(tokens.idToken);
            return;
          }
        } catch (tokenError) {
          console.log('getTokens() failed:', tokenError);
        }
        throw new Error('ID Token not received from Google Sign-In');
      }

      console.log('Step 3: ID Token received, proceeding with Firebase...');
      await completeAuthentication(result.idToken);

    } catch (err) {
      console.error('Full login error:', err);
      
      let errorMessage = 'Sign in failed';
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign in cancelled by user';
      } else if (err.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign in already in progress';
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services not available or outdated';
      } else if (err.message.includes('ID Token not received')) {
        errorMessage = 'Authentication failed. Please check your Google Sign-In configuration.';
      } else {
        errorMessage = err.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

const completeAuthentication = async (idToken) => {
  try {
    console.log('Step 4: Creating Firebase credential...');
    const googleCredential = GoogleAuthProvider.credential(idToken);
    
    console.log('Step 5: Signing in with Firebase...');
    const userCredential = await auth().signInWithCredential(googleCredential);
    const { user } = userCredential;

    console.log('Step 6: Firebase authentication successful:', user.uid);

    if (user) {
      const userData = {
        uid: user.uid,
        email: user.email,
        phoneNumber: user.phoneNumber || null,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        tokens: 0,
        lastLoginAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };

      console.log('Step 7: Saving user data...');
      
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      await AsyncStorage.setItem('isFromLogin', 'true'); // ⬅️ YEH ADD KARO
      
      // Create user on server
      await fetch(`${API_BASE}/chat_api.php?action=create_user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      navigation.navigate('Home');
    }
  } catch (apiError) {
    console.error('API Error:', apiError);
    throw apiError;
  }
};

  return (
    <>
    
      
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('./assets/logo.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
          </View>
 
          <View style={styles.textContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account to continue</Text>
          </View>
        </View>

        <SafeAreaView>
          <View style={styles.bottomContainer}>
            {loading ? (
              <LoadingScreen />
            ) : (
              <TouchableOpacity 
                style={styles.googleButton} 
                onPress={onGoogleButtonPress}
                activeOpacity={0.8}
              >
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>

        <Modal
          visible={!!error}
          transparent={true}
          animationType="fade"
          onRequestClose={clearError}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Authentication Error</Text>
              <Text style={styles.modalMessage}>{error}</Text>
              <TouchableOpacity style={styles.modalButton} onPress={clearError}>
                <Text style={styles.modalButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 60,
  },
  logo: {
    width: 120,
    height: 120,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4B4B4B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0052CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  googleIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: width - 48,
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#4B4B4B',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: '#0052CC',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LoginScreen;