package com.orbia.app;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;

import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;

public class OrbitMessageService extends WearableListenerService {

    private static final String TAG = "OrbitMessageService";
    private static final String OPEN_ORBIT_PATH = "/open-orbit";

    @Override
    public void onMessageReceived(MessageEvent messageEvent) {
        if (OPEN_ORBIT_PATH.equals(messageEvent.getPath())) {
            Log.d(TAG, "Received open-orbit message from watch");
            openOrbitPage();
        }
    }

    private void openOrbitPage() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.setData(Uri.parse("https://myorbia.com/orbit"));
        startActivity(intent);
    }
}
