package com.orbia.wear;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class OrbitApiClient {

    private static final String TAG = "OrbitApiClient";
    private static final String BASE_URL = "https://myorbia.com";
    private static final String PREFS_NAME = "orbia_auth";
    private static final String KEY_SESSION_COOKIE = "session_cookie";

    private final Context context;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public interface ConversationCallback {
        void onSuccess(String text, String audioBase64);
        void onError(String error);
    }

    public OrbitApiClient(Context context) {
        this.context = context.getApplicationContext();
    }

    public void shutdown() {
        executor.shutdownNow();
    }

    public boolean hasSession() {
        String cookie = getSessionCookie();
        return cookie != null && !cookie.isEmpty();
    }

    public String getSessionCookie() {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_SESSION_COOKIE, null);
    }

    public void saveSessionCookie(String cookie) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_SESSION_COOKIE, cookie).apply();
    }

    public void clearSession() {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(KEY_SESSION_COOKIE).apply();
    }

    public void converse(String message, ConversationCallback callback) {
        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(BASE_URL + "/api/voice/converse");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(60000);
                conn.setDoOutput(true);

                String cookie = getSessionCookie();
                if (cookie != null) {
                    conn.setRequestProperty("Cookie", cookie);
                }

                JSONObject body = new JSONObject();
                body.put("message", message);
                body.put("mode", "orbit");

                byte[] postData = body.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(postData);
                }

                int responseCode = conn.getResponseCode();

                if (responseCode == 401) {
                    clearSession();
                    callback.onError("SESSION_EXPIRED");
                    return;
                }

                if (responseCode != 200) {
                    String errorMsg = "Server error: " + responseCode;
                    try {
                        java.io.InputStream errorStream = conn.getErrorStream();
                        if (errorStream != null) {
                            StringBuilder errBody = new StringBuilder();
                            try (BufferedReader ebr = new BufferedReader(
                                    new InputStreamReader(errorStream, StandardCharsets.UTF_8))) {
                                String eLine;
                                while ((eLine = ebr.readLine()) != null) {
                                    errBody.append(eLine);
                                }
                            }
                            JSONObject errJson = new JSONObject(errBody.toString());
                            String detail = errJson.optString("error", "");
                            if (!detail.isEmpty()) {
                                errorMsg = detail;
                            }
                        }
                    } catch (Exception ignored) {}
                    callback.onError(errorMsg);
                    return;
                }

                StringBuilder response = new StringBuilder();
                try (BufferedReader br = new BufferedReader(
                        new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                }

                JSONObject json = new JSONObject(response.toString());
                String text = json.optString("text", "");
                String audio = json.optString("audio", null);

                callback.onSuccess(text, audio);

            } catch (Exception e) {
                Log.e(TAG, "Converse failed", e);
                callback.onError(e.getMessage() != null ? e.getMessage() : "Network error");
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }
}
