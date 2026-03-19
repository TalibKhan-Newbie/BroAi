package com.broai

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import androidx.multidex.MultiDexApplication
import com.dieam.reactnativepushnotification.ReactNativePushNotificationPackage
import android.app.Notification // Add this import


class MainApplication : MultiDexApplication(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    // Packages that cannot be autolinked yet can be added manually here
                    // Add ReactNativePushNotificationPackage if not auto-linked
                    add(ReactNativePushNotificationPackage())
                  
                }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        loadReactNative(this)
    }

    private fun createNotificationChannels() {
        Log.d("MainApplication", "Creating notification channels")
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Default channel for general notifications
            val defaultChannel = NotificationChannel(
                "default",
                "General Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Channel for general notifications"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000)
                setShowBadge(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC // Fixed: Now Notification is imported
            }

            // High priority channel for important notifications
            val highPriorityChannel = NotificationChannel(
                "high_priority",
                "Important Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Channel for important and time-sensitive notifications"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000)
                setShowBadge(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC // Fixed: Now Notification is imported
            }

            // Create channels
            notificationManager.createNotificationChannel(defaultChannel)
            notificationManager.createNotificationChannel(highPriorityChannel)
            
            Log.d("MainApplication", "Notification channels created: default, high_priority")
        }
    }
}