package com.gusmarsan.confessoquebebi;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private static final String APP_URL = "https://gusmarsan.github.io/confesso-que-bebi/";
    private static final String APP_HOST = "gusmarsan.github.io";
    private static final String AUTH_HOST = "confesso-que-bebi.firebaseapp.com";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(255, 250, 245));
        getWindow().setNavigationBarColor(Color.rgb(255, 250, 245));

        webView = new WebView(this);
        setContentView(webView);
        configureWebView();

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            openIntent(getIntent());
        }
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(settings.getUserAgentString() + " ConfessoQueBebiAndroid/0.1");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
            }
        });
    }

    private boolean handleNavigation(Uri uri) {
        if (uri == null) return false;

        String scheme = uri.getScheme();
        String host = uri.getHost();

        if ("confessoquebebi".equalsIgnoreCase(scheme)) {
            String target = uri.getQueryParameter("url");
            if (target != null && target.startsWith("https://")) {
                webView.loadUrl(target);
            } else {
                webView.loadUrl(APP_URL);
            }
            return true;
        }

        if ("https".equalsIgnoreCase(scheme)
                && (APP_HOST.equalsIgnoreCase(host) || AUTH_HOST.equalsIgnoreCase(host))) {
            return false;
        }

        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
            // Keep the user inside the app if Android cannot resolve an external URL.
        }
        return true;
    }

    private void openIntent(Intent intent) {
        Uri uri = intent != null ? intent.getData() : null;
        if (uri == null) {
            webView.loadUrl(APP_URL);
            return;
        }

        if ("confessoquebebi".equalsIgnoreCase(uri.getScheme())) {
            String target = uri.getQueryParameter("url");
            webView.loadUrl(target != null && target.startsWith("https://") ? target : APP_URL);
            return;
        }

        String host = uri.getHost();
        if ("https".equalsIgnoreCase(uri.getScheme())
                && (APP_HOST.equalsIgnoreCase(host) || AUTH_HOST.equalsIgnoreCase(host))) {
            webView.loadUrl(uri.toString());
        } else {
            webView.loadUrl(APP_URL);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openIntent(intent);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        CookieManager.getInstance().flush();
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
