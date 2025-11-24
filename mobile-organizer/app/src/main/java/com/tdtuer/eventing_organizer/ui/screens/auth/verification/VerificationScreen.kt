package com.tdtuer.eventing_organizer.ui.screens.auth.verification

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.content.Context
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.airbnb.lottie.compose.LottieAnimation
import com.airbnb.lottie.compose.LottieCompositionSpec
import com.airbnb.lottie.compose.LottieConstants
import com.airbnb.lottie.compose.rememberLottieComposition
import com.tdtuer.eventing_organizer.ui.theme.EventingTheme

@Composable
fun VerificationScreen(
    viewModel: VerificationViewModel = hiltViewModel(),
    onVerified: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val resendCooldown by viewModel.resendCooldown.collectAsState()
    val isResendEnabled by viewModel.isResendEnabled.collectAsState()
    val lifecycleOwner = LocalLifecycleOwner.current

    // Automatically check status when the user returns to the screen
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.checkVerificationStatus()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Send verification email on first composition
    LaunchedEffect(Unit) {
        viewModel.sendVerificationEmail()
    }

    // Navigate away once verification is confirmed
    LaunchedEffect(uiState.isVerified) {
        if (uiState.isVerified) {
            onVerified()
        }
    }

    VerificationContent(
        uiState = uiState,
        resendCooldown = resendCooldown,
        isResendEnabled = isResendEnabled,
        onResendClick = { viewModel.sendVerificationEmail() }
    )
}

@Composable
private fun VerificationContent(
    uiState: VerificationUiState,
    resendCooldown: Int,
    isResendEnabled: Boolean,
    onResendClick: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        AnimatedBackground()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            val composition by rememberLottieComposition(LottieCompositionSpec.RawRes(com.google.firebase.R.raw.firebase_common_keep))

            LottieAnimation(
                composition = composition,
                iterations = LottieConstants.IterateForever,
                modifier = Modifier.size(200.dp)
            )

            Text(
                text = "Check Your Inbox",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "We've sent a magical verification link to your email. Please check your inbox (and maybe your spam folder, just in case!).",
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(32.dp))

            AnimatedContent(targetState = uiState.isLoading, label = "loading-indicator") { isLoading ->
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(32.dp))
                } else {
                    Text(
                        text = "Waiting for you to click the link...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            TextButton(
                onClick = onResendClick,
                enabled = isResendEnabled
            ) {
                Text(
                    if (isResendEnabled) "Resend Email" else "Resend in $resendCooldown s"
                )
            }

            if (uiState.error != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = uiState.error,
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@SuppressLint("ConfigurationScreenWidthHeight")
@Composable
private fun AnimatedBackground() {
    val context = LocalContext.current
    val isLowRamDevice = remember {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        activityManager?.isLowRamDevice ?: false
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        // Chỉ chạy hiệu ứng nền trên các thiết bị không phải là low-RAM
        if (!isLowRamDevice) {
            val screenWidth = LocalConfiguration.current.screenWidthDp.dp
            val screenHeight = LocalConfiguration.current.screenHeightDp.dp

            val infiniteTransition = rememberInfiniteTransition(label = "background-transition")

            val animatedOffsetX1 by infiniteTransition.animateFloat(
                initialValue = -screenWidth.value / 2,
                targetValue = screenWidth.value / 2,
                animationSpec = infiniteRepeatable(
                    animation = tween(durationMillis = 10000, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                ), label = "offsetX1"
            )

            val animatedOffsetY1 by infiniteTransition.animateFloat(
                initialValue = -screenHeight.value / 4,
                targetValue = screenHeight.value / 4,
                animationSpec = infiniteRepeatable(
                    animation = tween(durationMillis = 12000, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                ), label = "offsetY1"
            )

            val animatedOffsetX2 by infiniteTransition.animateFloat(
                initialValue = screenWidth.value / 2,
                targetValue = -screenWidth.value / 2,
                animationSpec = infiniteRepeatable(
                    animation = tween(durationMillis = 15000, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                ), label = "offsetX2"
            )

            val animatedOffsetY2 by infiniteTransition.animateFloat(
                initialValue = screenHeight.value / 3,
                targetValue = -screenHeight.value / 3,
                animationSpec = infiniteRepeatable(
                    animation = tween(durationMillis = 9000, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                ), label = "offsetY2"
            )

            Box(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .offset(x = animatedOffsetX1.dp, y = animatedOffsetY1.dp)
                    .size(300.dp)
                    .blur(100.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.5f))
            )
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .offset(x = animatedOffsetX2.dp, y = animatedOffsetY2.dp)
                    .size(350.dp)
                    .blur(120.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.secondary.copy(alpha = 0.5f))
            )
        }
    }
}


// --- PREVIEWS ---

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun VerificationScreenPreview() {
    EventingTheme {
        VerificationContent(
            uiState = VerificationUiState(isLoading = false, isVerified = false, error = null),
            resendCooldown = 0,
            isResendEnabled = true,
            onResendClick = {}
        )
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun VerificationScreenLoadingPreview() {
    EventingTheme {
        VerificationContent(
            uiState = VerificationUiState(isLoading = true),
            resendCooldown = 0,
            isResendEnabled = true,
            onResendClick = {}
        )
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun VerificationScreenCooldownPreview() {
    EventingTheme {
        VerificationContent(
            uiState = VerificationUiState(isLoading = false),
            resendCooldown = 45,
            isResendEnabled = false,
            onResendClick = {}
        )
    }
}