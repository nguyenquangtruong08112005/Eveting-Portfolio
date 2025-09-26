package com.tdtuer.eventing.ui.screens

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.theme.EventingTheme
import kotlinx.coroutines.launch

// --- Data Model cho một trang Onboarding ---
data class OnboardingPage(
    val imageRes: Int,
    val title: String,
    val description: String
)

// --- Activity ---
class OnboardingActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                OnboardingScreen()
            }
        }
    }
}

// --- Composable cho toàn bộ màn hình Onboarding ---
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen() {
    val pages = listOf(
        OnboardingPage(
            imageRes = R.drawable.default_pfp,
            title = "Explore Upcoming and Nearby Events",
            description = "In publishing and graphic design, Lorem is a placeholder text commonly"
        ),
        OnboardingPage(
            imageRes = R.drawable.default_pfp,
            title = "Web Have Modern Events Calendar Feature",
            description = "In publishing and graphic design, Lorem is a placeholder text commonly"
        ),
        OnboardingPage(
            imageRes = R.drawable.default_pfp,
            title = "To Look Up More Events or Activities Nearby By Map",
            description = "In publishing and graphic design, Lorem is a placeholder text commonly"
        )
    )

    val pagerState = rememberPagerState(pageCount = { pages.size })
    val coroutineScope = rememberCoroutineScope()

    Scaffold(
        containerColor = Color.White
    ) { innerPadding ->
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
        ) { pageIndex ->
            OnboardingPageItem(page = pages[pageIndex], pagerState = pagerState) {
                // Xử lý nút Next/Get Started
                if (pagerState.currentPage < pages.size - 1) {
                    coroutineScope.launch {
                        pagerState.animateScrollToPage(pagerState.currentPage + 1)
                    }
                } else {
                    // Đã đến trang cuối, xử lý chuyển đến màn hình chính
                    // ví dụ: navController.navigate("home")
                }
            }
        }
    }
}

// --- Composable cho giao diện một trang Onboarding ---
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingPageItem(page: OnboardingPage, pagerState: PagerState, onNextClicked: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Phần ảnh phía trên
        Image(
            painter = painterResource(id = page.imageRes),
            contentDescription = page.title,
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            contentScale = ContentScale.Crop
        )

        // Phần nội dung màu tím phía dưới
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
            BottomControlRow(pagerState = pagerState, onNextClicked = onNextClicked)
        }
    }
}

// --- Composable cho hàng điều khiển (Skip, dots, Next) ---
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun BottomControlRow(pagerState: PagerState, onNextClicked: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // Nút Skip
        TextButton(onClick = { /* Xử lý chuyển đến màn hình chính */ }) {
            Text("Skip", color = Color.White.copy(alpha = 0.8f))
        }

        // Các dấu chấm chỉ báo trang
        PageIndicator(pageCount = pagerState.pageCount, currentPage = pagerState.currentPage)

        // Nút Next hoặc Get Started
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

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun OnboardingScreenPreview() {
    EventingTheme {
        OnboardingScreen()
    }
}