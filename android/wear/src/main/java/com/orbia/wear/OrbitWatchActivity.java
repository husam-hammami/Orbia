package com.orbia.wear;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.MediaPlayer;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.view.animation.AnimationSet;
import android.view.animation.ScaleAnimation;
import android.widget.ImageView;
import android.widget.ScrollView;
import android.widget.TextView;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;

public class OrbitWatchActivity extends Activity {

    private static final String TAG = "OrbitWatch";
    private static final int REQUEST_RECORD_AUDIO = 1;
    private static final int REQUEST_AUTH = 2;

    private enum State { IDLE, LISTENING, THINKING, SPEAKING }

    private ImageView orbLogo;
    private View pulseRing1;
    private View pulseRing2;
    private View pulseRing3;
    private TextView statusText;
    private TextView orbitLabel;
    private TextView transcriptText;
    private ScrollView transcriptScroll;
    private Handler handler = new Handler(Looper.getMainLooper());

    private State currentState = State.IDLE;
    private SpeechRecognizer speechRecognizer;
    private OrbitApiClient apiClient;
    private MediaPlayer mediaPlayer;

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
        transcriptText = findViewById(R.id.transcript_text);
        transcriptScroll = findViewById(R.id.transcript_scroll);

        apiClient = new OrbitApiClient(this);

        setState(State.IDLE);

        orbLogo.setOnClickListener(v -> onOrbTapped());
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (!apiClient.hasSession()) {
            statusText.setText(R.string.status_sign_in);
            statusText.setTextColor(getColor(R.color.orbia_muted));
        } else {
            statusText.setText(R.string.status_ready);
            statusText.setTextColor(getColor(R.color.orbia_glow));
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        destroySpeechRecognizer();
        releaseMediaPlayer();
        if (apiClient != null) {
            apiClient.shutdown();
        }
    }

    private void onOrbTapped() {
        Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (vibrator != null) {
            vibrator.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE));
        }

        switch (currentState) {
            case IDLE:
                if (!apiClient.hasSession()) {
                    launchAuth();
                    return;
                }
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_RECORD_AUDIO);
                    return;
                }
                startListening();
                break;
            case LISTENING:
                destroySpeechRecognizer();
                setState(State.IDLE);
                statusText.setText(R.string.status_ready);
                statusText.setTextColor(getColor(R.color.orbia_glow));
                break;
            case SPEAKING:
                stopSpeaking();
                setState(State.IDLE);
                break;
            case THINKING:
                break;
        }
    }

    private void launchAuth() {
        Intent intent = new Intent(this, WatchAuthActivity.class);
        startActivityForResult(intent, REQUEST_AUTH);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_AUTH) {
            if (resultCode == RESULT_OK && apiClient.hasSession()) {
                statusText.setText(R.string.status_ready);
                statusText.setTextColor(getColor(R.color.orbia_glow));
            } else {
                statusText.setText(R.string.status_sign_in);
                statusText.setTextColor(getColor(R.color.orbia_muted));
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_RECORD_AUDIO) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startListening();
            } else {
                statusText.setText(R.string.status_mic_denied);
                statusText.setTextColor(getColor(R.color.orbia_error));
            }
        }
    }

    private void setState(State newState) {
        currentState = newState;
        handler.post(() -> {
            switch (newState) {
                case IDLE:
                    orbitLabel.setText(R.string.orbit_label);
                    orbitLabel.setAlpha(0.6f);
                    startIdlePulse();
                    break;
                case LISTENING:
                    orbitLabel.setText(R.string.state_listening);
                    orbitLabel.setAlpha(1.0f);
                    startListeningPulse();
                    break;
                case THINKING:
                    orbitLabel.setText(R.string.state_thinking);
                    orbitLabel.setAlpha(1.0f);
                    startThinkingPulse();
                    break;
                case SPEAKING:
                    orbitLabel.setText(R.string.state_speaking);
                    orbitLabel.setAlpha(1.0f);
                    startSpeakingPulse();
                    break;
            }
        });
    }

    private void startListening() {
        transcriptScroll.setVisibility(View.VISIBLE);
        transcriptText.setText("");
        setState(State.LISTENING);
        statusText.setText(R.string.status_listening);
        statusText.setTextColor(getColor(R.color.orbia_glow));

        destroySpeechRecognizer();

        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            statusText.setText(R.string.status_no_speech);
            statusText.setTextColor(getColor(R.color.orbia_error));
            setState(State.IDLE);
            return;
        }

        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {
                Log.d(TAG, "Ready for speech");
            }

            @Override
            public void onBeginningOfSpeech() {
                Log.d(TAG, "Speech started");
            }

            @Override
            public void onRmsChanged(float rmsdB) {}

            @Override
            public void onBufferReceived(byte[] buffer) {}

            @Override
            public void onEndOfSpeech() {
                Log.d(TAG, "Speech ended");
            }

            @Override
            public void onError(int error) {
                Log.e(TAG, "Speech error: " + error);
                handler.post(() -> {
                    String msg;
                    switch (error) {
                        case SpeechRecognizer.ERROR_NO_MATCH:
                        case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                            msg = getString(R.string.status_no_speech_detected);
                            break;
                        case SpeechRecognizer.ERROR_NETWORK:
                        case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                            msg = getString(R.string.status_network_error);
                            break;
                        default:
                            msg = getString(R.string.status_try_again);
                            break;
                    }
                    statusText.setText(msg);
                    statusText.setTextColor(getColor(R.color.orbia_error));
                    setState(State.IDLE);
                    handler.postDelayed(() -> {
                        if (currentState == State.IDLE) {
                            statusText.setText(R.string.status_ready);
                            statusText.setTextColor(getColor(R.color.orbia_glow));
                        }
                    }, 3000);
                });
            }

            @Override
            public void onResults(Bundle results) {
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null && !matches.isEmpty()) {
                    String spokenText = matches.get(0);
                    Log.d(TAG, "Recognized: " + spokenText);
                    handler.post(() -> {
                        transcriptText.setText(spokenText);
                        sendToOrbit(spokenText);
                    });
                } else {
                    handler.post(() -> {
                        statusText.setText(R.string.status_no_speech_detected);
                        statusText.setTextColor(getColor(R.color.orbia_error));
                        setState(State.IDLE);
                    });
                }
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                ArrayList<String> partial = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (partial != null && !partial.isEmpty()) {
                    handler.post(() -> transcriptText.setText(partial.get(0)));
                }
            }

            @Override
            public void onEvent(int eventType, Bundle params) {}
        });

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

        speechRecognizer.startListening(intent);
    }

    private void stopListening() {
        if (speechRecognizer != null) {
            speechRecognizer.stopListening();
        }
    }

    private void destroySpeechRecognizer() {
        if (speechRecognizer != null) {
            try {
                speechRecognizer.stopListening();
                speechRecognizer.cancel();
                speechRecognizer.destroy();
            } catch (Exception e) {
                Log.w(TAG, "Error destroying speech recognizer", e);
            }
            speechRecognizer = null;
        }
    }

    private void sendToOrbit(String message) {
        setState(State.THINKING);
        statusText.setText(R.string.status_thinking);
        statusText.setTextColor(getColor(R.color.orbia_indigo));

        apiClient.converse(message, new OrbitApiClient.ConversationCallback() {
            @Override
            public void onSuccess(String text, String audioBase64) {
                handler.post(() -> {
                    transcriptText.setText(text);
                    transcriptScroll.setVisibility(View.VISIBLE);
                    transcriptScroll.post(() -> transcriptScroll.fullScroll(View.FOCUS_UP));

                    if (audioBase64 != null && !audioBase64.isEmpty()) {
                        playAudio(audioBase64);
                    } else {
                        statusText.setText(R.string.status_done);
                        statusText.setTextColor(getColor(R.color.orbia_glow));
                        setState(State.SPEAKING);
                        handler.postDelayed(() -> {
                            if (currentState == State.SPEAKING) {
                                setState(State.IDLE);
                                statusText.setText(R.string.status_ready);
                                statusText.setTextColor(getColor(R.color.orbia_glow));
                            }
                        }, 5000);
                    }
                });
            }

            @Override
            public void onError(String error) {
                handler.post(() -> {
                    if ("SESSION_EXPIRED".equals(error)) {
                        statusText.setText(R.string.status_session_expired);
                        statusText.setTextColor(getColor(R.color.orbia_error));
                        handler.postDelayed(() -> launchAuth(), 1500);
                    } else {
                        statusText.setText(R.string.status_error);
                        statusText.setTextColor(getColor(R.color.orbia_error));
                        transcriptText.setText(error);
                        transcriptScroll.setVisibility(View.VISIBLE);
                    }
                    setState(State.IDLE);
                    handler.postDelayed(() -> {
                        if (currentState == State.IDLE) {
                            statusText.setText(apiClient.hasSession() ? getString(R.string.status_ready) : getString(R.string.status_sign_in));
                            statusText.setTextColor(getColor(apiClient.hasSession() ? R.color.orbia_glow : R.color.orbia_muted));
                        }
                    }, 4000);
                });
            }
        });
    }

    private void playAudio(String base64Audio) {
        setState(State.SPEAKING);
        statusText.setText(R.string.status_speaking);
        statusText.setTextColor(getColor(R.color.orbia_violet));

        releaseMediaPlayer();

        try {
            byte[] audioBytes = Base64.decode(base64Audio, Base64.DEFAULT);
            File tempFile = new File(getCacheDir(), "orbit_response.mp3");
            try (FileOutputStream fos = new FileOutputStream(tempFile)) {
                fos.write(audioBytes);
            }

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(tempFile.getAbsolutePath());
            mediaPlayer.setOnPreparedListener(mp -> mp.start());
            mediaPlayer.setOnCompletionListener(mp -> {
                handler.post(() -> {
                    setState(State.IDLE);
                    statusText.setText(R.string.status_ready);
                    statusText.setTextColor(getColor(R.color.orbia_glow));
                });
            });
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "MediaPlayer error: " + what + ", " + extra);
                handler.post(() -> {
                    setState(State.IDLE);
                    statusText.setText(R.string.status_ready);
                    statusText.setTextColor(getColor(R.color.orbia_glow));
                });
                return true;
            });
            mediaPlayer.prepareAsync();

        } catch (IOException e) {
            Log.e(TAG, "Audio playback failed", e);
            setState(State.IDLE);
            statusText.setText(R.string.status_ready);
            statusText.setTextColor(getColor(R.color.orbia_glow));
        }
    }

    private void stopSpeaking() {
        releaseMediaPlayer();
    }

    private void releaseMediaPlayer() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
            } catch (Exception e) {
                Log.w(TAG, "Error releasing media player", e);
            }
            mediaPlayer = null;
        }
    }

    private void startIdlePulse() {
        pulseRing1.clearAnimation();
        pulseRing2.clearAnimation();
        pulseRing3.clearAnimation();
        animatePulseRing(pulseRing1, 0, 3000, 0.5f, 1.8f, 0.6f);
        animatePulseRing(pulseRing2, 1200, 3000, 0.5f, 1.8f, 0.5f);
        animatePulseRing(pulseRing3, 2400, 3000, 0.5f, 1.8f, 0.3f);
    }

    private void startListeningPulse() {
        pulseRing1.clearAnimation();
        pulseRing2.clearAnimation();
        pulseRing3.clearAnimation();
        animatePulseRing(pulseRing1, 0, 1200, 0.8f, 1.5f, 0.8f);
        animatePulseRing(pulseRing2, 400, 1200, 0.8f, 1.5f, 0.6f);
        animatePulseRing(pulseRing3, 800, 1200, 0.8f, 1.5f, 0.4f);
    }

    private void startThinkingPulse() {
        pulseRing1.clearAnimation();
        pulseRing2.clearAnimation();
        pulseRing3.clearAnimation();
        animatePulseRing(pulseRing1, 0, 800, 0.9f, 1.3f, 0.7f);
        animatePulseRing(pulseRing2, 267, 800, 0.9f, 1.3f, 0.5f);
        animatePulseRing(pulseRing3, 534, 800, 0.9f, 1.3f, 0.3f);
    }

    private void startSpeakingPulse() {
        pulseRing1.clearAnimation();
        pulseRing2.clearAnimation();
        pulseRing3.clearAnimation();
        animatePulseRing(pulseRing1, 0, 1500, 0.7f, 2.0f, 0.6f);
        animatePulseRing(pulseRing2, 500, 1500, 0.7f, 2.0f, 0.4f);
        animatePulseRing(pulseRing3, 1000, 1500, 0.7f, 2.0f, 0.2f);
    }

    private void animatePulseRing(View ring, long delay, int duration, float fromScale, float toScale, float startAlpha) {
        handler.postDelayed(() -> {
            ScaleAnimation scale = new ScaleAnimation(
                    fromScale, toScale, fromScale, toScale,
                    Animation.RELATIVE_TO_SELF, 0.5f,
                    Animation.RELATIVE_TO_SELF, 0.5f);
            scale.setDuration(duration);
            scale.setRepeatCount(Animation.INFINITE);
            scale.setInterpolator(new AccelerateDecelerateInterpolator());

            AlphaAnimation alpha = new AlphaAnimation(startAlpha, 0.0f);
            alpha.setDuration(duration);
            alpha.setRepeatCount(Animation.INFINITE);
            alpha.setInterpolator(new AccelerateDecelerateInterpolator());

            AnimationSet set = new AnimationSet(true);
            set.addAnimation(scale);
            set.addAnimation(alpha);

            ring.setVisibility(View.VISIBLE);
            ring.startAnimation(set);
        }, delay);
    }
}
