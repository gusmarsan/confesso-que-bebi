package com.gusmarsan.confessoquebebi;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private static final String APP_BASE_URL = "https://gusmarsan.github.io/confesso-que-bebi/index.html";
    private static final String LOGIN_URL = "https://gusmarsan.github.io/confesso-que-bebi/acesso.html";
    private static final String ENHANCEMENTS_URL = "https://gusmarsan.github.io/confesso-que-bebi/app-enhancements.js";
    private static final String DASHBOARD_URL = "https://gusmarsan.github.io/confesso-que-bebi/app-dashboard-v06.js";
    private static final String HISTORY_CHARTS_URL = "https://gusmarsan.github.io/confesso-que-bebi/history-charts-v075.js";
    private static final String APP_HOST = "gusmarsan.github.io";
    private static final String AUTH_HOST = "confesso-que-bebi.firebaseapp.com";
    private static final String APP_VERSION = "0.7.5";

    private WebView webView;
    private int authProbeAttempts = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(243, 228, 214));
        getWindow().setNavigationBarColor(Color.rgb(243, 228, 214));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(243, 228, 214));
        webView.setVisibility(View.INVISIBLE);
        setContentView(webView);
        configureWebView();

        // Remove stale HTML/script responses from older wrappers without touching
        // cookies or DOM storage, so the Firebase session remains available.
        webView.clearCache(true);

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            openIntent(getIntent());
        }
    }

    private String freshAppUrl() {
        return APP_BASE_URL + "?native=" + APP_VERSION + "&ts=" + System.currentTimeMillis();
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(settings.getUserAgentString() + " ConfessoQueBebiAndroid/" + APP_VERSION);

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
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                if (isAppPage(url)) {
                    authProbeAttempts = 0;
                    view.setVisibility(View.INVISIBLE);
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
                if (isAppPage(url)) {
                    installFreshModules(view);
                    forceVersionLabel(view);
                    revealWhenAuthIsReady(view);
                } else {
                    view.setVisibility(View.VISIBLE);
                }
            }
        });
    }

    private boolean isAppPage(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        if (!"https".equalsIgnoreCase(uri.getScheme()) || !APP_HOST.equalsIgnoreCase(uri.getHost())) {
            return false;
        }
        String path = uri.getPath();
        return "/confesso-que-bebi/".equals(path)
                || "/confesso-que-bebi/index.html".equals(path);
    }

    private void installFreshModules(WebView view) {
        final String script = "(function(){"
                + "function add(id,src){"
                + "if(document.getElementById(id))return;"
                + "var s=document.createElement('script');"
                + "s.id=id;s.type='module';s.src=src+'?ts='+Date.now();"
                + "document.head.appendChild(s);"
                + "}"
                + "add('cqb-enhancements-script','" + ENHANCEMENTS_URL + "');"
                + "add('cqb-dashboard-fresh-script','" + DASHBOARD_URL + "');"
                + "add('cqb-history-charts-script','" + HISTORY_CHARTS_URL + "');"
                + "})()";
        view.evaluateJavascript(script, null);
    }

    private void forceVersionLabel(WebView view) {
        final String script = "(function(){"
                + "var apply=function(){var v=document.getElementById('appVersion');"
                + "if(v){v.textContent='v" + APP_VERSION + "';v.setAttribute('aria-label','Versão do app " + APP_VERSION + "');}};"
                + "apply();setTimeout(apply,300);setTimeout(apply,1200);"
                + "})()";
        view.evaluateJavascript(script, null);
    }

    private void revealWhenAuthIsReady(WebView view) {
        final String probeScript = "(function(){"
                + "var auth=document.getElementById('authScreen');"
                + "var sync=document.getElementById('syncStatus');"
                + "if(auth&&auth.classList.contains('hidden'))return 'in';"
                + "if(sync&&sync.textContent.trim()==='Desconectado')return 'out';"
                + "return 'pending';"
                + "})()";

        view.evaluateJavascript(probeScript, result -> {
            if ("\"in\"".equals(result)) {
                installLogoutRedirectWatcher(view);
                view.setVisibility(View.VISIBLE);
                return;
            }

            if ("\"out\"".equals(result)) {
                view.loadUrl(LOGIN_URL + "?native=" + APP_VERSION + "&ts=" + System.currentTimeMillis());
                return;
            }

            authProbeAttempts++;
            if (authProbeAttempts < 80) {
                view.postDelayed(() -> revealWhenAuthIsReady(view), 50);
            } else {
                view.loadUrl(LOGIN_URL + "?native=" + APP_VERSION + "&ts=" + System.currentTimeMillis());
            }
        });
    }

    private void installLogoutRedirectWatcher(WebView view) {
        final String watcherScript = "(function(){"
                + "if(window.__cqbLogoutWatcher)return;"
                + "var auth=document.getElementById('authScreen');"
                + "if(!auth)return;"
                + "window.__cqbLogoutWatcher=true;"
                + "new MutationObserver(function(){"
                + "if(!auth.classList.contains('hidden'))location.replace('./acesso.html?ts='+Date.now());"
                + "}).observe(auth,{attributes:true,attributeFilter:['class']});"
                + "})()";
        view.evaluateJavascript(watcherScript, null);
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
                webView.loadUrl(freshAppUrl());
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
        }
        return true;
    }

    private void openIntent(Intent intent) {
        Uri uri = intent != null ? intent.getData() : null;
        if (uri == null) {
            webView.loadUrl(freshAppUrl());
            return;
        }

        if ("confessoquebebi".equalsIgnoreCase(uri.getScheme())) {
            String target = uri.getQueryParameter("url");
            webView.loadUrl(target != null && target.startsWith("https://") ? target : freshAppUrl());
            return;
        }

        String host = uri.getHost();
        if ("https".equalsIgnoreCase(uri.getScheme())
                && (APP_HOST.equalsIgnoreCase(host) || AUTH_HOST.equalsIgnoreCase(host))) {
            webView.loadUrl(uri.toString());
        } else {
            webView.loadUrl(freshAppUrl());
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
