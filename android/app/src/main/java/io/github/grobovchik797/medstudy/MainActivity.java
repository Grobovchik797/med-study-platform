package io.github.grobovchik797.medstudy;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

/**
 * Standalone Android container for Med Study. All learning assets are packaged
 * into the APK and served over an intercept-only HTTPS origin (no file://).
 * External NCBI sources open in the user's default browser, not this WebView.
 */
public final class MainActivity extends Activity {
    private WebView webView;
    private static final String LOCAL_DOMAIN = "appassets.androidplatform.net";
    private static final String START_URL =
        "https://" + LOCAL_DOMAIN + "/assets/www/index.html";

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        webView.setBackgroundColor(0xfff7f8fc);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/",
                new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(
                WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(
                WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (LOCAL_DOMAIN.equals(url.getHost())
                    && "https".equalsIgnoreCase(url.getScheme())) {
                    return false;
                }
                // Only explicit HTTPS links leave the app.
                if (!request.isForMainFrame() || !"https".equalsIgnoreCase(url.getScheme())) {
                    return true;
                }
                try {
                    Intent browser = new Intent(Intent.ACTION_VIEW, url);
                    startActivity(browser);
                } catch (Exception ignored) { /* No browser installed. */ }
                return true;
            }
        });
        webView.loadUrl(START_URL);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
