package com.orbia.wear;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class WatchAuthActivity extends Activity {

    private static final String TAG = "WatchAuth";
    private static final String TRUSTED_HOST = "myorbia.com";
    private static final String LOGIN_URL = "https://" + TRUSTED_HOST + "/auth";

    private WebView webView;
    private OrbitApiClient apiClient;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_watch_auth);

        apiClient = new OrbitApiClient(this);

        webView = findViewById(R.id.auth_webview);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUserAgentString(settings.getUserAgentString() + " OrbiaWatch/1.0");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, false);

        webView.setWebChromeClient(new WebChromeClient());

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!isTrustedUrl(uri)) {
                    return true;
                }
                if (isPostAuthUrl(uri)) {
                    extractAndSaveCookie();
                }
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Uri uri = Uri.parse(url);
                if (isTrustedUrl(uri) && isPostAuthUrl(uri)) {
                    extractAndSaveCookie();
                }
            }
        });

        webView.loadUrl(LOGIN_URL);
    }

    private boolean isTrustedUrl(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        String host = uri.getHost();
        return "https".equals(scheme) && TRUSTED_HOST.equals(host);
    }

    private boolean isPostAuthUrl(Uri uri) {
        String path = uri.getPath();
        return path == null || !path.startsWith("/auth");
    }

    private void extractAndSaveCookie() {
        CookieManager cookieManager = CookieManager.getInstance();
        String cookies = cookieManager.getCookie("https://" + TRUSTED_HOST);

        if (cookies != null && !cookies.isEmpty()) {
            String sessionCookie = null;
            String[] cookieParts = cookies.split(";");
            for (String part : cookieParts) {
                String trimmed = part.trim();
                if (trimmed.startsWith("connect.sid=")) {
                    sessionCookie = trimmed;
                    break;
                }
            }

            if (sessionCookie == null) {
                return;
            }

            apiClient.saveSessionCookie(sessionCookie);
            Log.d(TAG, "Session cookie saved");
            Toast.makeText(this, "Signed in", Toast.LENGTH_SHORT).show();

            setResult(RESULT_OK);
            finish();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            setResult(RESULT_CANCELED);
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
