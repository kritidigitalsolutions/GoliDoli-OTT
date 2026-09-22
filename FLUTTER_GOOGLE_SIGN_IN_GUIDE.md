# 🚀 Complete Flutter Google Sign-In Integration Guide (GoliDoli OTT)

This guide provides end-to-end setup and implementation of **Google Sign-In** for **Flutter** (Android, iOS, and Web) integrating with your live **GoliDoli Node.js Backend**.

---

## 📑 Table of Contents
1. [Backend Endpoint & Request Contract](#1-backend-endpoint--request-contract)
2. [Flutter Dependencies](#2-flutter-dependencies)
3. [Platform Setup](#3-platform-setup)
   - [Android Setup](#android-setup)
   - [Web Setup (Prevents COOP & Origin Errors)](#web-setup)
   - [iOS Setup](#ios-setup)
4. [Flutter Implementation Code](#4-flutter-implementation-code)
   - [GoogleAuthService (Service Layer)](#googleauthservice)
   - [GoogleSignInButton (UI Widget)](#googlesigninbutton)
5. [Common Errors & Troubleshooting](#5-common-errors--troubleshooting)

---

## 1. Backend Endpoint & Request Contract

Your backend endpoint is already configured and live:

* **Endpoint:** `POST https://golidoli.com/api/auth/google-login` (or `http://localhost:5000/api/auth/google-login`)
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "idToken": "<GOOGLE_ID_TOKEN>",
  "fcmToken": "<OPTIONAL_FIREBASE_FCM_TOKEN>"
}
```

* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Google login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "isNewUser": false,
  "user": {
    "id": "6a4786b42b4f9006b097e3ed",
    "name": "Kartikey",
    "email": "khandelwalkartik3451@gmail.com",
    "profileImage": "https://lh3.googleusercontent.com/a/...",
    "role": "USER"
  }
}
```

---

## 2. Flutter Dependencies

Add the following to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  google_sign_in: ^6.2.2
  http: ^1.2.2
  shared_preferences: ^2.3.2
  # Optional if using Firebase Messaging
  firebase_messaging: ^15.1.3
```

Run in terminal:
```bash
flutter pub get
```

---

## 3. Platform Setup

### Android Setup

1. Place your `google-services.json` inside:
   ```
   android/app/google-services.json
   ```
2. In `android/build.gradle`:
   ```gradle
   buildscript {
       dependencies {
           classpath 'com.google.gms:google-services:4.4.2'
       }
   }
   ```
3. In `android/app/build.gradle`:
   ```gradle
   apply plugin: 'com.android.application'
   apply plugin: 'com.google.gms.google-services' // Add this at the bottom or plugins block
   ```
4. **Add SHA-1 and SHA-256 Fingerprints in Firebase Console:**
   * Run in project root:
     ```bash
     cd android && ./gradlew signingReport
     ```
   * Copy the `SHA-1` and `SHA-256` keys and add them under **Firebase Console ➔ Project Settings ➔ Your Android App ➔ SHA Certificate Fingerprints**.

---

### Web Setup (Prevents COOP & Origin Errors)

1. Open `web/index.html` and add the Google Client ID inside `<head>`:
   ```html
   <meta name="google-signin-client_id" content="807853365926-ad785gcjvkcq1oiusk3sn9uisc586k4q.apps.googleusercontent.com">
   ```

2. **Web Script Configuration in `web/index.html`:**
   Add Google Identity Services before `</head>`:
   ```html
   <script src="https://accounts.google.com/gsi/client" async defer></script>
   ```

3. **Avoid COOP / Popup Block on Web:**
   If your Flutter web app is deployed on Netlify or Vercel, ensure the headers allow popups:
   * **Netlify (`_headers` file in `web/` folder):**
     ```text
     /*
       Cross-Origin-Opener-Policy: same-origin-allow-popups
     ```
   * **Vercel (`vercel.json`):**
     ```json
     {
       "headers": [
         {
           "source": "/(.*)",
           "headers": [
             { "key": "Cross-Origin-Opener-Policy", "value": "same-origin-allow-popups" }
           ]
         }
       ]
     }
     ```

---

### iOS Setup

1. Place `GoogleService-Info.plist` inside `ios/Runner/`.
2. In `ios/Runner/Info.plist`, add your `REVERSED_CLIENT_ID`:
   ```xml
   <key>CFBundleURLTypes</key>
   <array>
       <dict>
           <key>CFBundleTypeRole</key>
           <string>Editor</string>
           <key>CFBundleURLSchemes</key>
           <array>
               <string>com.googleusercontent.apps.807853365926-1rhv...</string>
           </array>
       </dict>
   </array>
   ```

---

## 4. Flutter Implementation Code

### `GoogleAuthService` (services/google_auth_service.dart)

Create a dedicated service to handle Google authentication and API communication:

```dart
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class GoogleAuthService {
  // Your Backend Base URL
  static const String _baseUrl = 'https://golidoli.com/api'; // Or 'http://localhost:5000/api' for local dev

  // Your Google Web Client ID from backend .env
  static const String _webClientId = '807853365926-ad785gcjvkcq1oiusk3sn9uisc586k4q.apps.googleusercontent.com';

  static final GoogleSignIn _googleSignIn = GoogleSignIn(
    clientId: kIsWeb ? _webClientId : null,
    serverClientId: _webClientId, // Required to get idToken on Android/iOS
    scopes: [
      'email',
      'profile',
      'openid',
    ],
  );

  /// Performs Google Sign-In, retrieves idToken, and sends to Backend API
  static Future<Map<String, dynamic>?> signInWithGoogle({String? fcmToken}) async {
    try {
      // 1. Trigger Google Sign-In flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        // User cancelled sign-in
        return null;
      }

      // 2. Retrieve Authentication Tokens
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? idToken = googleAuth.idToken;

      if (idToken == null || idToken.isEmpty) {
        throw Exception('Failed to obtain Google ID Token.');
      }

      // 3. Send idToken to Backend API
      final response = await http.post(
        Uri.parse('$_baseUrl/auth/google-login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'idToken': idToken,
          'fcmToken': fcmToken ?? '',
        }),
      );

      final Map<String, dynamic> data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        // 4. Save App JWT token to local storage
        final prefs = await SharedPreferences.getInstance();
        if (data['token'] != null) {
          await prefs.setString('app_jwt_token', data['token']);
        }
        if (data['user'] != null) {
          await prefs.setString('user_data', jsonEncode(data['user']));
        }
        return data;
      } else {
        throw Exception(data['message'] ?? 'Backend Google login failed.');
      }
    } catch (e) {
      debugPrint('❌ Google Sign-In Error: $e');
      rethrow;
    }
  }

  /// Sign out from Google & clear stored session
  static Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('app_jwt_token');
      await prefs.remove('user_data');
    } catch (e) {
      debugPrint('Error signing out: $e');
    }
  }
}
```

---

### `GoogleSignInButton` (widgets/google_sign_in_button.dart)

Create a modern, clean UI button for user login:

```dart
import 'package:flutter/material.dart';
import '../services/google_auth_service.dart';

class GoogleSignInButton extends StatefulWidget {
  final VoidCallback? onSuccess;
  final Function(String error)? onError;

  const GoogleSignInButton({
    super.key,
    this.onSuccess,
    this.onError,
  });

  @override
  State<GoogleSignInButton> createState() => _GoogleSignInButtonState();
}

class _GoogleSignInButtonState extends State<GoogleSignInButton> {
  bool _isLoading = false;

  Future<void> _handleGoogleSignIn() async {
    setState(() => _isLoading = true);
    try {
      final result = await GoogleAuthService.signInWithGoogle();
      if (result != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Welcome, ${result['user']?['name'] ?? 'User'}! 🎉'),
            backgroundColor: Colors.green,
          ),
        );
        widget.onSuccess?.call();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sign-in failed: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.redAccent,
          ),
        );
        widget.onError?.call(e.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: OutlinedButton(
        onPressed: _isLoading ? null : _handleGoogleSignIn,
        style: OutlinedButton.styleFrom(
          backgroundColor: Colors.white,
          side: const BorderSide(color: Color(0xFFE0E0E0), width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 0,
        ),
        child: _isLoading
            ? const SizedBox(
                height: 24,
                width: 24,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Image.network(
                    'https://developers.google.com/identity/images/g-logo.png',
                    height: 22,
                    width: 22,
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Continue with Google',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1F1F1F),
                      fontFamily: 'Outfit',
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
```

---

## 5. Common Errors & Troubleshooting

| Error | Cause | Solution |
| :--- | :--- | :--- |
| **`Error 400: origin_mismatch`** | Current domain/port not in Authorized JavaScript Origins | Add `http://localhost:5173`, `https://golidoli.com`, etc. in [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials?project=golidoli). |
| **`People API PERMISSION_DENIED`** | People API is disabled in Google Cloud | Enable it at [Google People API](https://console.cloud.google.com/apis/library/people.googleapis.com?project=golidoli). |
| **`Cross-Origin-Opener-Policy blocked`** | Browser COOP isolation blocking popup communication | Add `Cross-Origin-Opener-Policy: same-origin-allow-popups` in your hosting headers (e.g. `netlify.toml` or `vercel.json`). |
| **`idToken is null on Android`** | `serverClientId` missing in `GoogleSignIn()` | Always pass `serverClientId: '807853365926-ad785gcjvkcq1oiusk3sn9uisc586k4q.apps.googleusercontent.com'` in `GoogleSignIn(...)`. |
| **`ApiException: 10` on Android** | SHA-1 certificate fingerprint mismatch | Generate SHA-1 via `./gradlew signingReport` and add it to Firebase Project Settings. |
