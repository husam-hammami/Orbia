package com.orbia.wear;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.view.animation.AnimationSet;
import android.view.animation.ScaleAnimation;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.Task;
import com.google.android.gms.wearable.CapabilityClient;
import com.google.android.gms.wearable.CapabilityInfo;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.Wearable;

import java.util.Set;

public class OrbitWatchActivity extends Activity {

    private static final String TAG = "OrbitWatch";
    private static final String OPEN_ORBIT_CAPABILITY = "open_orbit";
    private static final String OPEN_ORBIT_PATH = "/open-orbit";

    private ImageView orbLogo;
    private View pulseRing1;
    private View pulseRing2;
    private View pulseRing3;
    private TextView statusText;
    private TextView orbitLabel;
    private String bestNodeId = null;
    private Handler handler = new Handler(Looper.getMainLooper());
    private boolean isAnimating = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_orbit_watch);

        orbLogo = findViewById(R.id.orb_logo);
        pulseRing1 = findViewById(R.id.pulse_ring_1);
        pulseRing2 = findViewById(R.id.pulse_ring_2);
        pulseRing3 = findViewById(R.id.pulse_ring_3);
        statusText = findViewById(R.id.status_text);
        orbitLabel = findViewById(R.id.orbit_label);

        startIdlePulse();

        orbLogo.setOnClickListener(v -> {
            if (!isAnimating) {
                onOrbTapped();
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        findBestNode();
    }

    private void findBestNode() {
        Task<CapabilityInfo> capabilityTask = Wearable.getCapabilityClient(this)
                .getCapability(OPEN_ORBIT_CAPABILITY, CapabilityClient.FILTER_REACHABLE);

        capabilityTask.addOnSuccessListener(capabilityInfo -> {
            Set<Node> nodes = capabilityInfo.getNodes();
            bestNodeId = pickBestNodeId(nodes);
            if (bestNodeId != null) {
                statusText.setText("Phone connected");
                statusText.setTextColor(getColor(R.color.orbia_glow));
            } else {
                statusText.setText("Open Orbia on phone");
                statusText.setTextColor(getColor(R.color.orbia_muted));
            }
        });

        capabilityTask.addOnFailureListener(e -> {
            Log.e(TAG, "Capability query failed", e);
            statusText.setText("Open Orbia on phone");
            statusText.setTextColor(getColor(R.color.orbia_muted));
        });
    }

    private String pickBestNodeId(Set<Node> nodes) {
        String bestNode = null;
        for (Node node : nodes) {
            if (node.isNearby()) {
                return node.getId();
            }
            bestNode = node.getId();
        }
        return bestNode;
    }

    private void onOrbTapped() {
        isAnimating = true;

        Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (vibrator != null) {
            vibrator.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE));
        }

        playActivationAnimation();

        findBestNode();

        handler.postDelayed(() -> {
            if (bestNodeId != null) {
                sendOpenOrbitMessage();
            } else {
                openOrbitOnWatch();
            }
        }, 600);
    }

    private void sendOpenOrbitMessage() {
        Wearable.getMessageClient(this)
                .sendMessage(bestNodeId, OPEN_ORBIT_PATH, new byte[0])
                .addOnSuccessListener(msgId -> {
                    Log.d(TAG, "Orbit launch message sent: " + msgId);
                    statusText.setText("Orbit activated");
                    statusText.setTextColor(getColor(R.color.orbia_glow));

                    Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                    if (vibrator != null) {
                        long[] pattern = {0, 30, 60, 30};
                        vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                    }

                    handler.postDelayed(() -> {
                        statusText.setText("Phone connected");
                        isAnimating = false;
                    }, 2000);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Failed to send message", e);
                    openOrbitOnWatch();
                });
    }

    private void openOrbitOnWatch() {
        try {
            android.content.Intent intent = new android.content.Intent(
                    android.content.Intent.ACTION_VIEW,
                    Uri.parse("https://myorbia.com/orbit"));
            intent.addCategory(android.content.Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
            statusText.setText("Opening Orbit...");
            statusText.setTextColor(getColor(R.color.orbia_glow));
        } catch (Exception e) {
            Log.e(TAG, "Failed to open browser", e);
            statusText.setText("Open Orbia on phone");
            statusText.setTextColor(getColor(R.color.orbia_muted));
        }
        handler.postDelayed(() -> isAnimating = false, 1000);
    }

    private void startIdlePulse() {
        animatePulseRing(pulseRing1, 0);
        animatePulseRing(pulseRing2, 1200);
        animatePulseRing(pulseRing3, 2400);
    }

    private void animatePulseRing(View ring, long delay) {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                ScaleAnimation scale = new ScaleAnimation(
                        0.5f, 1.8f, 0.5f, 1.8f,
                        Animation.RELATIVE_TO_SELF, 0.5f,
                        Animation.RELATIVE_TO_SELF, 0.5f);
                scale.setDuration(3000);
                scale.setRepeatCount(Animation.INFINITE);
                scale.setInterpolator(new AccelerateDecelerateInterpolator());

                AlphaAnimation alpha = new AlphaAnimation(0.6f, 0.0f);
                alpha.setDuration(3000);
                alpha.setRepeatCount(Animation.INFINITE);
                alpha.setInterpolator(new AccelerateDecelerateInterpolator());

                AnimationSet set = new AnimationSet(true);
                set.addAnimation(scale);
                set.addAnimation(alpha);

                ring.setVisibility(View.VISIBLE);
                ring.startAnimation(set);
            }
        }, delay);
    }

    private void playActivationAnimation() {
        pulseRing1.clearAnimation();
        pulseRing2.clearAnimation();
        pulseRing3.clearAnimation();

        ScaleAnimation pressScale = new ScaleAnimation(
                1.0f, 0.85f, 1.0f, 0.85f,
                Animation.RELATIVE_TO_SELF, 0.5f,
                Animation.RELATIVE_TO_SELF, 0.5f);
        pressScale.setDuration(100);
        pressScale.setFillAfter(false);

        ScaleAnimation bounceBack = new ScaleAnimation(
                0.85f, 1.15f, 0.85f, 1.15f,
                Animation.RELATIVE_TO_SELF, 0.5f,
                Animation.RELATIVE_TO_SELF, 0.5f);
        bounceBack.setDuration(200);
        bounceBack.setStartOffset(100);
        bounceBack.setFillAfter(false);

        ScaleAnimation settle = new ScaleAnimation(
                1.15f, 1.0f, 1.15f, 1.0f,
                Animation.RELATIVE_TO_SELF, 0.5f,
                Animation.RELATIVE_TO_SELF, 0.5f);
        settle.setDuration(150);
        settle.setStartOffset(300);
        settle.setFillAfter(true);

        AnimationSet logoAnim = new AnimationSet(false);
        logoAnim.addAnimation(pressScale);
        logoAnim.addAnimation(bounceBack);
        logoAnim.addAnimation(settle);

        logoAnim.setAnimationListener(new Animation.AnimationListener() {
            @Override
            public void onAnimationStart(Animation animation) {
                orbitLabel.animate().alpha(1.0f).setDuration(300).start();
            }

            @Override
            public void onAnimationEnd(Animation animation) {
                handler.postDelayed(() -> {
                    startIdlePulse();
                    orbitLabel.animate().alpha(0.6f).setDuration(800).start();
                }, 1500);
            }

            @Override
            public void onAnimationRepeat(Animation animation) {}
        });

        orbLogo.startAnimation(logoAnim);

        playActivationBurst(pulseRing1, 0);
        playActivationBurst(pulseRing2, 150);
        playActivationBurst(pulseRing3, 300);
    }

    private void playActivationBurst(View ring, long delay) {
        handler.postDelayed(() -> {
            ScaleAnimation burst = new ScaleAnimation(
                    0.3f, 2.5f, 0.3f, 2.5f,
                    Animation.RELATIVE_TO_SELF, 0.5f,
                    Animation.RELATIVE_TO_SELF, 0.5f);
            burst.setDuration(500);
            burst.setInterpolator(new AccelerateDecelerateInterpolator());

            AlphaAnimation fade = new AlphaAnimation(0.8f, 0.0f);
            fade.setDuration(500);

            AnimationSet set = new AnimationSet(true);
            set.addAnimation(burst);
            set.addAnimation(fade);

            ring.startAnimation(set);
        }, delay);
    }
}
