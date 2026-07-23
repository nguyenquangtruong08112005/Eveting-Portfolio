package com.tdtuer.eventing.ui.screens.splash

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.R

@Composable
fun SplashScreen(
    viewModel: SplashViewModel = viewModel(), // Thêm giá trị mặc định
    onNavigateToOnboarding: () -> Unit,
    onNavigateToAuth: () -> Unit, // Thêm lambda cho màn hình Auth
    onNavigateToHome: () -> Unit
) {
    val destination by viewModel.destination.collectAsState()
    var startAnimation by remember { mutableStateOf(false) }

    val alphaAnim = animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(durationMillis = 10)
    )

    LaunchedEffect(key1 = true) {
        startAnimation = true
    }

    // Sử dụng LaunchedEffect để lắng nghe sự thay đổi của destination
    // và chỉ điều hướng một lần khi destination không phải là Loading.
    LaunchedEffect(destination) {
        when (val dest = destination) { // Gán giá trị để smart cast
            is SplashNavDestination.GoToOnboarding -> onNavigateToOnboarding()
            is SplashNavDestination.GoToAuth -> onNavigateToAuth() // Gọi lambda tương ứng
            is SplashNavDestination.GoToHome -> onNavigateToHome()
            is SplashNavDestination.Loading -> { /* Do nothing while loading */ }
        }
    }

    SplashUI(alpha = alphaAnim.value)
}

@Composable
fun SplashUI(alpha: Float) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.alpha(alpha) 
        ) {
            Image(
                painter = painterResource(id = R.drawable.group_33657),
                contentDescription = "Eventing Logo"
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun SplashScreenPreview() {
    SplashUI(alpha = 1f)
}
