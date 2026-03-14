package com.orbia.wear;

import android.content.SharedPreferences;
import android.util.Log;

import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;

public class AuthReceiverService extends WearableListenerService {

    private static final String TAG = "AuthReceiver";
    private static final String AUTH_PATH = "/orbia-auth";
    private static final String PREFS_NAME = "orbia_auth";
    private static final String KEY_SESSION_COOKIE = "session_cookie";

    @Override
    public void onMessageReceived(MessageEvent messageEvent) {
        if (AUTH_PATH.equals(messageEvent.getPath())) {
            byte[] data = messageEvent.getData();
            if (data != null && data.length > 0) {
                String cookie = new String(data, java.nio.charset.StandardCharsets.UTF_8);
                Log.d(TAG, "Received auth cookie from phone, length: " + cookie.length());

                SharedPreferences prefs = getApplicationContext()
                        .getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                prefs.edit().putString(KEY_SESSION_COOKIE, cookie).apply();

                Log.d(TAG, "Auth cookie saved from phone companion");
            }
        }
    }
}
