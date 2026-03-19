import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image } from 'react-native';

const MiniLoader = ({ size = 40, containerStyle }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous rotation animation (counter-clockwise)
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1500, // Slightly faster for mini loader
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
            transform: [{ rotate: spin }]
          }
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    justifyContent: 'start',
    alignItems: 'left',
    padding: 15,
    marginHorizontal : -20,
  },
  logo: {
    // Remove shadows for cleaner mini look
  },
});

export default MiniLoader;