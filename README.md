# 🤖 BroAI — Fast. Free. Limitless.

> An all-in-one AI chatbot app built with **React Native**, powered by OpenAI, Gemini & Runware APIs, with Firebase Auth and a PHP + MySQL backend.

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.73+-blue?logo=react" />
  <img src="https://img.shields.io/badge/Firebase-Auth-orange?logo=firebase" />
  <img src="https://img.shields.io/badge/PHP-Backend-purple?logo=php" />
  <img src="https://img.shields.io/badge/MySQL-Database-blue?logo=mysql" />
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS-green" />
  <img src="https://img.shields.io/badge/License-MIT-lightgrey" />
</p>

<p align="center">
  <a href="https://play.google.com/store/apps/details?id=com.broai">
    <img src="https://img.shields.io/badge/Download-Google_Play-34A853?logo=google-play&logoColor=white" height="30"/>
  </a>
</p>

---

## 📁 Project Structure

```
BroAI/
│
├── /screens/                  # All React Native screen files (.js)
│   ├── HomeScreen.js
│   ├── ChatScreen.js
│   ├── LoginScreen.js
│   ├── RegisterScreen.js
│   ├── ProfileScreen.js
│   └── ...                    # Other screens
│
├── /api/                      # PHP backend files
│   ├── config.php             # DB connection config
│   ├── auth.php               # Login / Register API
│   ├── chat.php               # Chat history API
│   └── ...                    # Other endpoints
│
├── /db/                       # Database setup
│   └── broai.sql              # MySQL database import file
│
├── /android/                  # Android native folder
│   └── app/
│       └── google-services.json   # Firebase Android config ← place here
│
├── /ios/                      # iOS native folder
│   └── GoogleService-Info.plist   # Firebase iOS config ← place here
│
├── App.tsx                    # Root component
├── package.json
└── README.md
```

---

## ⚙️ Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18+)
- [React Native CLI](https://reactnative.dev/docs/environment-setup)
- [Android Studio](https://developer.android.com/studio) (for Android)
- [Xcode](https://developer.apple.com/xcode/) (for iOS, macOS only)
- [XAMPP](https://www.apachefriends.org/) or [WAMP](https://www.wampserver.com/) (for localhost PHP + MySQL)
- [Composer](https://getcomposer.org/) (optional, for PHP packages)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/broai.git
cd broai
```

### 2. Install Dependencies

```bash
npm install
# OR
yarn install
```

---

## 🛢️ Database Setup (MySQL — Localhost)

### Step 1 — Start XAMPP / WAMP

Start **Apache** and **MySQL** from the XAMPP/WAMP control panel.

### Step 2 — Create Database

Open [http://localhost/phpmyadmin](http://localhost/phpmyadmin) in your browser.

1. Click **"New"** in the left panel
2. Name the database: `broai_db`
3. Click **Create**

### Step 3 — Import SQL File

1. Click on `broai_db`
2. Go to the **Import** tab
3. Click **Choose File** → select `/db/broai.sql`
4. Click **Go**

Your tables will be created automatically. ✅

---

## 🐘 PHP Backend Setup (Localhost)

### Step 1 — Place API Files

Copy the `/api` folder into your XAMPP/WAMP web root:

```
# XAMPP (Windows)
C:/xampp/htdocs/broai/api/

# WAMP (Windows)
C:/wamp64/www/broai/api/

# Linux
/var/www/html/broai/api/
```

### Step 2 — Configure Database Connection

Open `/api/config.php` and update your credentials:

```php
<?php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');        // your MySQL username
define('DB_PASS', '');            // your MySQL password (blank for XAMPP default)
define('DB_NAME', 'broai_db');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    die(json_encode(['error' => 'Connection failed: ' . $conn->connect_error]));
}
?>
```

### Step 3 — Test API

Visit in browser:

```
http://localhost/broai/api/auth.php
```

You should see a JSON response. ✅

### Step 4 — Update API Base URL in App

In your React Native project, find the API base URL constant (usually in `/screens/` or a `config.js` file) and update it:

```js
// For Android Emulator — use 10.0.2.2 instead of localhost
export const BASE_URL = 'http://10.0.2.2/broai/api';

// For Physical Device — use your PC's local IP
export const BASE_URL = 'http://192.168.1.x/broai/api';
```

> 💡 Find your local IP: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

---

## 🔥 Firebase Setup

BroAI uses **Firebase Authentication** (Email/Password, Google Sign-In).

### Step 1 — Create Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → Name it `BroAI`
3. Disable Google Analytics (optional) → Click **Create Project**

### Step 2 — Enable Authentication

1. In Firebase Console → **Authentication** → **Get Started**
2. Enable **Email/Password**
3. Enable **Google** sign-in (add your SHA-1 key for Android)

---

### 🤖 Android — `google-services.json`

1. In Firebase Console → **Project Settings** → **Your Apps**
2. Click **Add App** → Select **Android**
3. Enter package name: `com.broai`
4. Click **Register App**
5. Download `google-services.json`
6. Place it at:

```
/android/app/google-services.json
```

> ⚠️ This file must be inside `/android/app/` — NOT the root `/android/` folder.

---

### 🍎 iOS — `GoogleService-Info.plist`

1. In Firebase Console → **Project Settings** → **Your Apps**
2. Click **Add App** → Select **iOS**
3. Enter bundle ID (e.g., `com.broai`)
4. Download `GoogleService-Info.plist`
5. Place it at:

```
/ios/GoogleService-Info.plist
```

Also open Xcode → right-click your project → **Add Files** → select the `.plist` file.

---

### 🌐 Firebase Web Config (for PHP backend / web use)

1. In Firebase Console → **Project Settings** → **Your Apps**
2. Click **Add App** → Select **Web** (`</>`)
3. Register the app
4. Copy the config and use in your PHP or web files:

```js
// firebaseConfig.js or inside your PHP page's <script> tag
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

```php
// In PHP (for Firebase REST API calls)
define('FIREBASE_API_KEY', 'YOUR_API_KEY');
define('FIREBASE_PROJECT_ID', 'your-project-id');
```

---

## 🔑 API Keys Required

Create a `.env` file in the root of your project:

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxx
RUNWARE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ Never commit your `.env` file. Add it to `.gitignore`.

Install `react-native-dotenv` or `react-native-config` to use env variables:

```bash
npm install react-native-config
```

---

## ▶️ Running the App

### Start Metro

```bash
npm start
# OR
yarn start
```

### Android

```bash
npm run android
# OR
yarn android
```

### iOS

```bash
bundle install          # only first time
bundle exec pod install # install CocoaPods
npm run ios
```

---

## 📦 Build for Production (Play Store)

### Generate Signed APK / AAB

```bash
cd android
./gradlew bundleRelease   # AAB (recommended for Play Store)
# OR
./gradlew assembleRelease # APK
```

Output will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

> Make sure your `android/app/build.gradle` has the correct `keystore` signing config set up.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native |
| Authentication | Firebase Auth |
| AI Chat | OpenAI API / Gemini API |
| Image Generation | Runware API |
| Backend | PHP (REST API) |
| Database | MySQL |
| Hosting (API) | Localhost / cPanel / VPS |

---

## 🔒 Security Notes

- Never push `google-services.json`, `GoogleService-Info.plist`, or `.env` to GitHub
- Add them to `.gitignore`:

```gitignore
# Firebase
android/app/google-services.json
ios/GoogleService-Info.plist

# Environment
.env
.env.local
```

---

## 📬 Contact

Built with ❤️ by **Rotara Labs**

For personal development, collaboration, or queries:

📧 **talibkhanshah@gmail.com**

[![Play Store](https://img.shields.io/badge/Download_BroAI-Play_Store-green?logo=google-play)](https://play.google.com/store/apps/details?id=com.broai)

---

## 📄 License

This project is licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for details.
