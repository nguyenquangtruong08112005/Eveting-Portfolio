package com.tdtuer.eventing.ui.screens.onboarding

import android.os.Bundle
import android.widget.Toast // Example: For showing onboarding complete message
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels // Added for ViewModel
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext // For Toast
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
// R class import is still needed for resources used directly in UI, if any
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.theme.EventingTheme
// OnboardingPage data class is now in OnboardingViewModel.kt

// --- Activity ---
@OptIn(ExperimentalFoundationApi::class) // May be needed here if PagerState is used directly
class OnboardingActivity : ComponentActivity() {
    private val viewModel: OnboardingViewModel by viewModels() // Use ViewModel delegate

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                OnboardingScreen(viewModel = viewModel) // Pass ViewModel
            }
        }
    }
}

// --- Composable cho toàn bộ màn hình Onboarding ---
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(viewModel: OnboardingViewModel) { // Accept ViewModel
    val pages = viewModel.pages
    val pagerState = rememberPagerState(pageCount = { pages.size })
    val context = LocalContext.current // For Toast example

    // Listen for onboarding completion
    LaunchedEffect(key1 = Unit) {
        viewModel.onboardingComplete.collect {
            // Navigate to your main app screen or login screen
            Toast.makeText(context, "Onboarding Complete! Navigating to Home...", Toast.LENGTH_LONG).show()
            // Example: navController.navigate("home_screen_route") { popUpTo("onboarding_route") { inclusive = true } }
            // Or finish() the activity if it's standalone
        }
    }

    Scaffold(
        containerColor = Color.White
    ) { innerPadding ->
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
        ) { pageIndex ->
            OnboardingPageItem(
                page = pages[pageIndex],
                pagerState = pagerState,
                onNextClicked = { viewModel.onNextClicked(pagerState) }, // Delegate to ViewModel
                onSkipClicked = { viewModel.onSkipClicked() } // Delegate to ViewModel
            )
        }
    }
}

// --- Composable cho giao diện một trang Onboarding ---
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingPageItem(
    page: OnboardingPage,
    pagerState: PagerState, // Still needed for BottomControlRow unless that also takes ViewModel
    onNextClicked: () -> Unit,
    onSkipClicked: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        Image(
            painter = painterResource(id = page.imageRes),
            contentDescription = page.title,
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            contentScale = ContentScale.Crop
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .background(Color(0xFF5669FF))
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = page.title,
                color = Color.White,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                lineHeight = 30.sp
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = page.description,
                color = Color.White.copy(alpha = 0.8f),
                textAlign = TextAlign.Center,
                fontSize = 14.sp
            )
            Spacer(modifier = Modifier.height(32.dp))
            BottomControlRow(
                pagerState = pagerState,
                onNextClicked = onNextClicked,
                onSkipClicked = onSkipClicked
            )
        }
    }
}

// --- Composable cho hàng điều khiển (Skip, dots, Next) ---
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun BottomControlRow(
    pagerState: PagerState,
    onNextClicked: () -> Unit,
    onSkipClicked: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        TextButton(onClick = onSkipClicked) {
            Text("Skip", color = Color.White.copy(alpha = 0.8f))
        }
        PageIndicator(pageCount = pagerState.pageCount, currentPage = pagerState.currentPage)
        Button(
            onClick = onNextClicked,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color.White,
                contentColor = Color(0xFF5669FF)
            )
        ) {
            val buttonText = if (pagerState.currentPage == pagerState.pageCount - 1) "Get Started" else "Next"
            Text(buttonText)
        }
    }
}

// --- Composable cho các dấu chấm chỉ báo trang ---
@Composable
fun PageIndicator(pageCount: Int, currentPage: Int) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(pageCount) { iteration ->
            val color = if (currentPage == iteration) Color.White else Color.White.copy(alpha = 0.5f)
            Box(
                modifier = Modifier
                    .size(if (currentPage == iteration) 10.dp else 8.dp)
                    .clip(CircleShape)
                    .background(color)
            )
        }
    }
}

@OptIn(ExperimentalFoundationApi::class) // Might be needed if preview uses PagerState indirectly
@Preview(showBackground = true, showSystemUi = true)
@Composable
fun OnboardingScreenPreview() {
    EventingTheme {
        // For preview, create a new instance of the ViewModel
        OnboardingScreen(viewModel = OnboardingViewModel())
    }
}
