import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, Dimensions, Image, Alert, Linking, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import { SafeAreaView } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(1)).current;
  const logoFadeAnim = useRef(new Animated.Value(1)).current;
  const [appVersion, setAppVersion] = useState('1.0.0');

  // Check and request notification permissions
  async function checkNotificationPermission() {
    try {
      let permission;
      
      if (Platform.OS === 'ios') {
        permission = PERMISSIONS.IOS.NOTIFICATIONS;
      } else if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          permission = PERMISSIONS.ANDROID.POST_NOTIFICATIONS;
        } else {
          console.log('Notification permission not required for Android API < 33');
          return true;
        }
      } else {
        return true;
      }

      if (!permission) {
        return true;
      }

      console.log('Checking permission:', permission);
      const result = await check(permission);
      console.log('Notification permission status:', result);

      if (result === RESULTS.GRANTED) {
        return true;
      }

      if (result === RESULTS.DENIED || result === RESULTS.BLOCKED) {
        console.log('Requesting permission:', permission);
        const requestResult = await request(permission);
        console.log('Notification permission request result:', requestResult);
        return requestResult === RESULTS.GRANTED;
      }

      return false;
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  // Request notification permission and get FCM token
  async function requestUserPermission() {
    try {
      console.log('Starting notification permission flow...');
      
      if (Platform.OS === 'ios' || (Platform.OS === 'android' && Platform.Version >= 33)) {
        const permissionGranted = await checkNotificationPermission();
        
        if (!permissionGranted) {
          console.log('Notification permission not granted');
          return;
        }
      }
      
      // Get FCM token using Firebase Messaging
      await setupFCMToken();
      
    } catch (error) {
      console.error('Error in requestUserPermission:', error);
    }
  }

  async function setupFCMToken() {
    try {
      const authStatus = await messaging().hasPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        const newAuthStatus = await messaging().requestPermission();
        const newEnabled =
          newAuthStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          newAuthStatus === messaging.AuthorizationStatus.PROVISIONAL;
        
        if (!newEnabled) {
          console.log('FCM permission denied by user');
          return;
        }
      }

      console.log('FCM Authorization status:', authStatus);
      const token = await messaging().getToken();
      console.log('FCM Token received:', token);

      await AsyncStorage.setItem('fcmToken', token);

      // ⬇️ CHANGED: Use 'userData' instead of 'user'
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        const userId = userData.uid;
        if (userId) {
          await sendTokenToBackend(token, userId);
        } else {
          console.log('No user ID found, saving token for later');
          await AsyncStorage.setItem('pendingFCMToken', token);
        }
      } else {
        console.log('No user data, saving token for later');
        await AsyncStorage.setItem('pendingFCMToken', token);
      }
    } catch (error) {
      console.error('Error setting up FCM token:', error);
    }
  }

  async function sendTokenToBackend(token, userId, retryCount = 0) {
    const maxRetries = 3;
    console.log(`Sending token for user ${userId}`);
    try {
      const response = await axios.post(
        'api/acessnoti.php',
        {
          action: 'save_token',
          userId,
          fcmToken: token,
        },
        { timeout: 10000 }
      );
      console.log('Token save response:', response.data?.message || 'Success');
      await AsyncStorage.removeItem('pendingFCMToken');
      return true;
    } catch (error) {
      console.error(`Token save failed (attempt ${retryCount + 1}):`, error.message);
      if (retryCount < maxRetries) {
        console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return sendTokenToBackend(token, userId, retryCount + 1);
      }
      return false;
    }
  }

  async function updateLastActive(userId) {
    try {
      await axios.post(
        'api/acessnoti.php',
        {
          action: 'update_last_active',
          userId,
        },
        { timeout: 5000 }
      );
      console.log('Last active updated');
    } catch (error) {
      console.error('Error updating last active:', error.message);
    }
  }

  async function handleDeepLink(url) {
    if (url) {
      const route = url.replace(/.*?:\/\//g, '');
      console.log('Deep link route:', route);
      
      if (route === 'open/offer' || route.includes('ImageScreen')) {
        setTimeout(() => {
          navigation.navigate('ImageScreen');
          console.log('Navigated to ImageScreen via deep link');
        }, 1000);
      }
    }
  }

  const fetchUserData = async () => {
    try {
      // ⬇️ CHANGED: Use 'userData' instead of 'user'
      const storedUserData = await AsyncStorage.getItem('userData');
      
      if (!storedUserData) {
        console.log('No user data found');
        return null;
      }

      const userData = JSON.parse(storedUserData);
      const userId = userData.uid;

      if (!userId) {
        console.log('No user ID found in user data');
        return null;
      }

      await updateLastActive(userId);

      // Check for pending FCM token and send it
      const pendingToken = await AsyncStorage.getItem('pendingFCMToken');
      if (pendingToken) {
        console.log('Sending pending FCM token');
        await sendTokenToBackend(pendingToken, userId);
      }

      // Optional: Fetch latest user data from server
      try {
        const response = await axios.post('api/getUserData.php', {
          user_id: userId,
        }, { timeout: 5000 });

        if (response.data.success) {
          const userDataFromApi = response.data.user;
          await AsyncStorage.setItem('userData', JSON.stringify(userDataFromApi));
          return userDataFromApi;
        }
      } catch (apiError) {
        console.log('API fetch failed, using cached data:', apiError.message);
      }
      
      return userData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  const getAppVersion = async () => {
    try {
      const version = DeviceInfo.getVersion();
      const buildNumber = DeviceInfo.getBuildNumber();
      setAppVersion(`${version} (${buildNumber})`);
    } catch (error) {
      console.log('Could not get app version, using default');
      setAppVersion('1.0.0');
    }
  };

  useEffect(() => {
    getAppVersion();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Shrink and fade animation after delay
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoScaleAnim, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(logoFadeAnim, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2500);

    // Valid routes for notifications
    const validRoutes = ['Home', 'ImageScreen', 'Login', 'Splash'];

    // Foreground notification handler
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('Foreground notification:', remoteMessage.notification?.title);
      
      Alert.alert(
        remoteMessage.notification?.title || 'Notification',
        remoteMessage.notification?.body || 'New message received',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open',
            onPress: () => {
              if (remoteMessage?.data?.route && validRoutes.includes(remoteMessage.data.route)) {
                try {
                  navigation.navigate(remoteMessage.data.route);
                } catch (error) {
                  console.error('Navigation error:', error);
                }
              }
            },
          },
        ]
      );
    });

    // Background notification handler
    const unsubscribeNotificationOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened from background');
      if (remoteMessage?.data?.route && validRoutes.includes(remoteMessage.data.route)) {
        setTimeout(() => {
          try {
            navigation.navigate(remoteMessage.data.route);
          } catch (error) {
            console.error('Navigation error:', error);
          }
        }, 2000);
      }
    });

    // Quit state notification handler
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage?.data?.route && validRoutes.includes(remoteMessage.data.route)) {
        setTimeout(() => {
          try {
            navigation.navigate(remoteMessage.data.route);
          } catch (error) {
            console.error('Navigation error:', error);
          }
        }, 3000);
      }
    });

    // Request notification permission with delay
    setTimeout(() => {
      requestUserPermission();
    }, 1500);

    // Handle token refresh
    const unsubscribeToken = messaging().onTokenRefresh(async token => {
      console.log('FCM Token refreshed');
      await AsyncStorage.setItem('fcmToken', token);
      
      // ⬇️ CHANGED: Use 'userData' instead of 'user'
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        const userId = userData.uid;
        if (userId) {
          await sendTokenToBackend(token, userId);
        } else {
          await AsyncStorage.setItem('pendingFCMToken', token);
        }
      } else {
        await AsyncStorage.setItem('pendingFCMToken', token);
      }
    });

    // Handle deep links
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url);
    });

    // ⬇️ MAIN CHANGE: Check login status
    const checkLogin = async () => {
      try {
        // Mark that splash has been seen
        await AsyncStorage.setItem('hasSeenSplash', 'true');
        
        // Check for userData (changed from 'user')
        const userData = await AsyncStorage.getItem('userData');
        
        if (userData) {
          console.log('User logged in, fetching latest data...');
          await fetchUserData();
          navigation.replace('Home');
        } else {
          console.log('No user found, navigating to Login');
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('Login check error:', error);
        navigation.replace('Login');
      }
    };

    // Wait 2 seconds before checking (for animations)
    const timer = setTimeout(checkLogin, 2000);

    // Cleanup
    return () => {
      clearTimeout(timer);
      unsubscribeToken();
      unsubscribeForeground();
      unsubscribeNotificationOpened();
      if (linkingSubscription?.remove) {
        linkingSubscription.remove();
      }
    };
  }, [navigation, fadeAnim, slideAnim, rotateAnim, logoScaleAnim, logoFadeAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg']
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.logoWrapper,
            {
              opacity: logoFadeAnim,
              transform: [
                { scale: logoScaleAnim },
                { rotate: spin }
              ]
            }
          ]}
        >
          <Image 
            source={require('./assets/logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View 
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.appName}>Bro AI</Text>
          <Text style={styles.tagline}>Your Smart Assistant</Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.bottomContainer,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <Text style={styles.poweredByText}>Powered by</Text>
          <Text style={styles.companyText}>Rotara Labs</Text>
        </Animated.View>

        <View style={styles.decorativeElements}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
          <View style={[styles.circle, styles.circle4]} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoWrapper: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 180,
    height: 180,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 42,
    color: '#000000',
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '400',
    letterSpacing: 1.2,
    fontStyle: 'italic',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  poweredByText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '400',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  companyText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  versionText: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  circle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
  },
  circle1: {
    width: 120,
    height: 120,
    top: height * 0.1,
    right: -40,
  },
  circle2: {
    width: 180,
    height: 180,
    bottom: height * 0.15,
    left: -90,
  },
  circle3: {
    width: 100,
    height: 100,
    top: height * 0.4,
    left: width * 0.15,
    backgroundColor: '#FAFAFA',
  },
  circle4: {
    width: 80,
    height: 80,
    bottom: height * 0.3,
    right: width * 0.1,
    backgroundColor: '#F0F0F0',
  },
});

export default SplashScreen;