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

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class WatchAuthActivity extends Activity {

    private static final String TAG = "WatchAuth";

    private static final Set<String> OAUTH_PROVIDER_HOSTS = new HashSet<>(Arrays.asList(
            "login.microsoftonline.com",
            "accounts.google.com",
            "appleid.apple.com",
            "github.com",
            "login.live.com"
    ));

    private WebView webView;
    private OrbitApiClient apiClient;
    private String trustedHost;
    private String loginUrl;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_watch_auth);

        String baseUrl = getString(R.string.api_base_url);
        trustedHost = Uri.parse(baseUrl).getHost();
        loginUrl = baseUrl + "/auth";

        apiClient = new OrbitApiClient(this);

        webView = findViewById(R.id.auth_webview);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUserAgentString(settings.getUserAgentString() + " OrbiaWatch/1.0");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient());

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!isAllowedUrl(uri)) {
                    return true;
                }
                if (isOrbiaPostAuth(uri)) {
                    extractAndSaveCookie();
                }
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Uri uri = Uri.parse(url);
                if (isOrbiaPostAuth(uri)) {
                    extractAndSaveCookie();
                }
            }
        });

        webView.loadUrl(loginUrl);
    }

    private boolean isAllowedUrl(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        if (!"https".equals(scheme)) return false;
        String host = uri.getHost();
        if (host == null) return false;
        if (host.equals(trustedHost)) return true;
        return OAUTH_PROVIDER_HOSTS.contains(host);
    }

    private boolean isOrbiaPostAuth(Uri uri) {
        if (uri == null) return false;
        String host = uri.getHost();
        if (!trustedHost.equals(host)) return false;
        if (!"https".equals(uri.getScheme())) return false;
        String path = uri.getPath();
        return path == null || !path.startsWith("/auth");
    }

    private void extractAndSaveCookie() {
        CookieManager cookieManager = CookieManager.getInstance();
        String cookies = cookieManager.getCookie("https://" + trustedHost);

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
