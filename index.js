/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

// Initialize Firebase app
const app = getApp();

// Get messaging instance and set background handler
const messaging = getMessaging(app);

setBackgroundMessageHandler(messaging, async remoteMessage => {
  console.log('Background Message:', remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);