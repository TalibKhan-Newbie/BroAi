import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from './screens/SplashScreen';
import Login from './screens/LoginScreen';
import Home from './screens/Home';
import ImageScreen from './screens/ImageScreen';
import UpdateScreen from './screens/UpdateScreen';
import GalleryScreen from './screens/GalleryScreen';
import Licence from './screens/Licence';
import Report from './screens/Report';

import axios from 'axios';
import DeviceInfo from 'react-native-device-info';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['myapp://'],
  config: {
    screens: {
      ImageScreen: 'open/offer',
    },
  },
};

const App = () => {
  const [isVersionChecked, setIsVersionChecked] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Splash');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        // 1. Check if user is already logged in
        const userData = await AsyncStorage.getItem('userData');
        const hasSeenSplash = await AsyncStorage.getItem('hasSeenSplash');
        
        if (userData) {
          setIsLoggedIn(true);
        }

        // 2. Notification permission
        await askNotificationPermission();

        // 3. Version check
        await checkAppVersion();

        // 4. Determine initial route
        if (needsUpdate) {
          setInitialRoute('Update');
        } else if (userData && hasSeenSplash) {
          // User logged in hai aur splash dekh chuka hai - direct home
          setInitialRoute('Home');
        } else if (userData && !hasSeenSplash) {
          // User logged in hai but splash nahi dekha - splash dikhao
          setInitialRoute('Splash');
        } else {
          // User logged in nahi hai - splash dikhao
          setInitialRoute('Splash');
        }

      } catch (error) {
        console.error('Initialization error:', error);
        setInitialRoute('Splash');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    GoogleSignin.configure({
      webClientId: '',
    });
  }, []);

  const checkAppVersion = async () => {
    try {
      const appVersion = await DeviceInfo.getVersion();
      const response = await axios.get('api/version.php');
      const apiVersion = response.data.version;

      if (appVersion !== apiVersion) {
        setNeedsUpdate(true);
      } else {
        setNeedsUpdate(false);
      }
    } catch (error) {
      console.error('Error checking version:', error);
      setNeedsUpdate(false);
    } finally {
      setIsVersionChecked(true);
    }
  };

  const askNotificationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'This app needs notification permission to send you updates',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Notification permission granted');
          } else {
            console.log('Notification permission denied');
          }
        } else {
          console.log('Notification permission not required for this Android version');
        }
      } else if (Platform.OS === 'ios') {
        console.log('iOS notification permission handling needed');
      }
      
      setIsPermissionChecked(true);
    } catch (error) {
      console.error('Error in notification permission flow:', error);
      setIsPermissionChecked(true);
    }
  };

  // Wait until all checks are complete
  if (isLoading || !isVersionChecked || !isPermissionChecked) {
    return null;
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 300,
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{
            animation: 'fade',
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="Licence"
          component={Licence}
          options={{
            animation: 'fade',
            animationDuration: 300,
            headerShown: true
          }}
        />
     
        <Stack.Screen name="TemplatePreview" component={TemplatePreview} />
        <Stack.Screen
          name="Report" 
          component={Report}
          options={{
            animation: 'fade',
            animationDuration: 300,
            headerShown: true
          }}
        />
        <Stack.Screen
          name="Login"
          component={Login}
          options={{
            animation: 'fade',
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="Home"
          component={Home}
          options={{
            animation: 'fade',
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="Gallery"
          component={GalleryScreen}
          options={{
            animation: 'fade',
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="ImageScreen"
          component={ImageScreen}
          options={{
            animation: 'fade',
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="Update"
          component={UpdateScreen}
          options={{
            animation: 'fade',
            animationDuration: 300,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;