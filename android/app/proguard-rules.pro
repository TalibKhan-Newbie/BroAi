# Add project-specific ProGuard rules here.
# For more details, see http://developer.android.com/guide/developing/tools/proguard.html

# React Native
-keep class com.facebook.react.** { *; }
-dontwarn com.facebook.react.**

# Hermes
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.hermes.**

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# react-native-push-notification
-keep class com.dieam.reactnativepushnotification.** { *; }
-dontwarn com.dieam.reactnativepushnotification.**

# If libmbrainSDK is part of your app or an SDK
-keep class com.broai.** { *; }
-dontwarn com.broai.**

# Prevent R8 from removing Multidex
-keep class androidx.multidex.** { *; }
-dontwarn androidx.multidex.**

# Keep JavaScriptCore for JSC fallback (if needed)
-keep class io.github.react-native-community.jsc.** { *; }
-dontwarn io.github.react-native-community.jsc.**