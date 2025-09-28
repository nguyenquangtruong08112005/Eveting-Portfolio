package com.tdtuer.eventing.ui.screens.splash

import android.os.Bundle
import android.widget.Toast // Example for showing navigation intent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels // Added for ViewModel
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect // Added for observing ViewModel events
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext // For Toast example
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.theme.EventingTheme
// SplashViewModel is now used

class SplashScreenActivity : ComponentActivity() {
    private val viewModel: SplashViewModel by viewModels() // Use ViewModel delegate

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                // Pass ViewModel if SplashScreen composable needs it, or observe events here
                SplashScreen(viewModel = viewModel) 
            }
        }
    }
}

@Composable
fun SplashScreen(viewModel: SplashViewModel) { // Accept ViewModel
    val context = LocalContext.current // For Toast example

    // Observe navigation trigger from ViewModel
    LaunchedEffect(key1 = Unit) {
        viewModel.navigateToNextScreen.collect {
            // TODO: Implement actual navigation to your next screen (e.g., Onboarding, Login, or Home)
            Toast.makeText(context, "Splash finished, navigating to next screen...", Toast.LENGTH_SHORT).show()
            // Example: navController.navigate("onboarding_route") { popUpTo("splash_route") { inclusive = true } }
            // Or if this is the launcher activity, start a new Activity and finish this one.
            // val intent = Intent(context, YourNextActivity::class.java)
            // context.startActivity(intent)
            // (context as? Activity)?.finish() // Finish SplashScreenActivity
        }
    }

    // UI remains the same visually
    val backgroundGradient = Brush.verticalGradient(
        colors = listOf(
            Color.White,
            Color(0xFFF2F6FF), // Màu xanh tím rất nhạt
            Color.White
        )
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = backgroundGradient),
        contentAlignment = Alignment.Center // Căn chỉnh mọi thứ vào chính Mitte
    ) {
        Image(
            painter = painterResource(id = R.drawable.default_pfp), // Tên file logo bạn đã lưu
            contentDescription = "EventHub Logo",
            modifier = Modifier.width(200.dp) // Điều chỉnh kích thước logo nếu cần
        )
    }
}

@Preview(showSystemUi = true, showBackground = true)
@Composable
fun SplashScreenPreview() {
    EventingTheme {
        // For preview, you might not need the ViewModel's delay logic,
        // or you can pass a dummy ViewModel if the SplashScreen composable requires it.
        // Since our SplashScreen composable now takes a ViewModel, we provide one.
        SplashScreen(viewModel = SplashViewModel()) // Pass a new instance for preview
    }
}
