import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Linking, Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const UpdateScreen = () => {
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.broai';

  const handleUpdate = () => {
    Linking.openURL(playStoreUrl);
  };

  const handleClose = () => {
    if (Platform.OS === 'android') {
      import('react-native').then(({ BackHandler }) => {
        BackHandler.exitApp();
      });
    } else {
      alert('Please close the app manually.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image
            source={require('./assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>UPDATE</Text>
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>New Version Available</Text>
          <Text style={styles.subtitle}>
            We've made some exciting improvements and bug fixes to enhance your experience.
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• Improved performance</Text>
            <Text style={styles.featureItem}>• New features added</Text>
            <Text style={styles.featureItem}>• Bug fixes and stability</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleUpdate}>
            <Text style={styles.primaryButtonText}>Update Now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleClose}>
            <Text style={styles.secondaryButtonText}>Close App</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Link */}
        <TouchableOpacity onPress={handleUpdate}>
          <Text style={styles.footerLink}>
            Or visit Play Store directly
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  featureList: {
    alignSelf: 'stretch',
    paddingHorizontal: 20,
  },
  featureItem: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 8,
    textAlign: 'left',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DDDDDD',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 0.5,
  },
  footerLink: {
    fontSize: 14,
    color: '#666666',
    textDecorationLine: 'underline',
    letterSpacing: 0.3,
  },
});

export default UpdateScreen;