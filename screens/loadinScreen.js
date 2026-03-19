import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image } from 'react-native';

const { width, height } = Dimensions.get('window');

const LoadingScreen = ({ size = 80, containerStyle }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Continuous rotation animation (counter-clockwise)
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg']
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.Image
        source={require('./assets/logo.png')}
        style={[
          styles.logo,
          {
            width: size,
            height: size,
            opacity: fadeAnim,
            transform: [{ rotate: spin }]
          }
        ]}
        resizeMode="contain"
      />
      
      <View style={styles.decorativeElements}>
  
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logo: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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

export default LoadingScreen;