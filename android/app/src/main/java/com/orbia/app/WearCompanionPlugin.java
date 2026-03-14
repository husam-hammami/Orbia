package com.orbia.app;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.webkit.CookieManager;

import androidx.wear.remote.interactions.RemoteActivityHelper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.tasks.Tasks;
import com.google.android.gms.wearable.CapabilityClient;
import com.google.android.gms.wearable.CapabilityInfo;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.NodeClient;
import com.google.android.gms.wearable.Wearable;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "WearCompanion")
public class WearCompanionPlugin extends Plugin {

    private static final String TAG = "WearCompanion";
    private static final String AUTH_PATH = "/orbia-auth";
    private static final String WATCH_APP_CAPABILITY = "orbia_watch_voice";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void checkWatchStatus(PluginCall call) {
        executor.execute(() -> {
            try {
                NodeClient nodeClient = Wearable.getNodeClient(getActivity());
                Task<List<Node>> nodeTask = nodeClient.getConnectedNodes();
                List<Node> nodes = Tasks.await(nodeTask);

                boolean hasWatch = !nodes.isEmpty();
                boolean watchAppInstalled = false;
                String watchNodeId = null;

                if (hasWatch) {
                    watchNodeId = nodes.get(0).getId();

                    try {
                        Task<CapabilityInfo> capTask = Wearable.getCapabilityClient(getActivity())
                                .getCapability(WATCH_APP_CAPABILITY, CapabilityClient.FILTER_ALL);
                        CapabilityInfo info = Tasks.await(capTask);
                        Set<Node> capNodes = info.getNodes();
                        watchAppInstalled = !capNodes.isEmpty();
                        if (watchAppInstalled) {
                            for (Node n : capNodes) {
                                watchNodeId = n.getId();
                                break;
                            }
                        }
                    } catch (Exception e) {
                        Log.d(TAG, "Capability check failed (app likely not installed): " + e.getMessage());
                    }
                }

                JSObject result = new JSObject();
                result.put("hasWatch", hasWatch);
                result.put("watchAppInstalled", watchAppInstalled);
                result.put("watchNodeId", watchNodeId);
                result.put("watchName", hasWatch ? nodes.get(0).getDisplayName() : null);
                call.resolve(result);

            } catch (Exception e) {
                Log.e(TAG, "checkWatchStatus failed", e);
                JSObject result = new JSObject();
                result.put("hasWatch", false);
                result.put("watchAppInstalled", false);
                result.put("watchNodeId", null);
                result.put("watchName", null);
                call.resolve(result);
            }
        });
    }

    @PluginMethod
    public void sendAuthToWatch(PluginCall call) {
        String nodeId = call.getString("nodeId");
        if (nodeId == null || nodeId.isEmpty()) {
            call.reject("nodeId is required");
            return;
        }

        executor.execute(() -> {
            try {
                String cookie = getSessionCookie();
                if (cookie == null || cookie.isEmpty()) {
                    call.reject("No session cookie found. Please log in first.");
                    return;
                }

                byte[] cookieBytes = cookie.getBytes("UTF-8");
                Task<Integer> sendTask = Wearable.getMessageClient(getActivity())
                        .sendMessage(nodeId, AUTH_PATH, cookieBytes);
                Tasks.await(sendTask);

                Log.d(TAG, "Auth sent to watch node: " + nodeId);
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);

            } catch (Exception e) {
                Log.e(TAG, "sendAuthToWatch failed", e);
                call.reject("Failed to send auth to watch: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void installOnWatch(PluginCall call) {
        try {
            RemoteActivityHelper remoteHelper = new RemoteActivityHelper(getActivity(), executor);
            Intent intent = new Intent(Intent.ACTION_VIEW)
                    .addCategory(Intent.CATEGORY_BROWSABLE)
                    .setData(Uri.parse("market://details?id=com.orbia.wear"));

            remoteHelper.startRemoteActivity(intent);

            Log.d(TAG, "Install request sent to watch");
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "installOnWatch failed", e);
            call.reject("Failed to install on watch: " + e.getMessage());
        }
    }

    private String getSessionCookie() {
        try {
            CookieManager cookieManager = CookieManager.getInstance();
            String cookies = cookieManager.getCookie("https://myorbia.com");
            if (cookies != null) {
                String[] parts = cookies.split(";");
                for (String part : parts) {
                    String trimmed = part.trim();
                    if (trimmed.startsWith("connect.sid=")) {
                        return trimmed;
                    }
                }
                return cookies;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to get session cookie", e);
        }
        return null;
    }
}
