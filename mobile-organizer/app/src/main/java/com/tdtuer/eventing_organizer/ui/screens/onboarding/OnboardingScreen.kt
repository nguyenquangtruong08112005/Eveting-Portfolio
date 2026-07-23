package com.tdtuer.eventing_organizer.ui.screens.onboarding

import androidx.compose.animation.*
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
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
import androidx.compose.ui.graphics.GraphicsLayerScope
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.util.lerp
import androidx.lifecycle.viewmodel.compose.viewModel // Thay thế hiltViewModel
import com.tdtuer.eventing_organizer.R
import com.tdtuer.eventing_organizer.ui.theme.AppTheme
import kotlin.math.absoluteValue

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(
    viewModel: OnboardingViewModel = viewModel(), // Sử dụng viewModel() tiêu chuẩn
    onOnboardingComplete: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val pagerState = rememberPagerState(pageCount = { uiState.pages.size })

    // Lắng nghe trạng thái hoàn tất onboarding
    LaunchedEffect(uiState.isOnboardingComplete) {
        if (uiState.isOnboardingComplete) {
            onOnboardingComplete()
        }
    }

    // Tự động cuộn pager khi currentPage trong state thay đổi
    LaunchedEffect(uiState.currentPage) {
        if (uiState.currentPage != pagerState.currentPage) {
            pagerState.animateScrollToPage(uiState.currentPage)
        }
    }

    // Cập nhật lại state trong ViewModel khi người dùng tự cuộn pager
    LaunchedEffect(pagerState.currentPage) {
        if (pagerState.currentPage != uiState.currentPage) {
            viewModel.onPageChanged(pagerState.currentPage)
        }
    }

    Scaffold(
        containerColor = AppTheme.colorScheme.background
    ) { innerPadding ->
        if (uiState.pages.isNotEmpty()) { // Đảm bảo pages đã được load
            HorizontalPager(
                state = pagerState,
                modifier = Modifier
                    .padding(innerPadding)
                    .fillMaxSize()
            ) { pageIndex ->
                OnboardingPageItem(
                    page = uiState.pages[pageIndex],
                    pagerState = pagerState,
                    pageIndex = pageIndex,
                    onNextClicked = viewModel::onNextClicked,
                    onSkipClicked = viewModel::onSkipClicked
                )
            }
        }
    }
}

// Các Composable còn lại (OnboardingPageItem, BottomControlRow, PageIndicator, pagerAnimation)
// không có thay đổi và được giữ nguyên như trong file gốc của bạn.

@ExperimentalFoundationApi
@Composable
fun OnboardingPageItem(
    page: OnboardingPage,
    pagerState: PagerState,
    pageIndex: Int,
    onNextClicked: () -> Unit,
    onSkipClicked: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        Column (
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .background(AppTheme.colorScheme.background)
                .pagerAnimation(pagerState, pageIndex) { pageOffset ->
                    translationX = size.width * pageOffset * 0.5f
                },
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(64.dp))
            Image(
                painter = painterResource(id = R.drawable.group_33657),
                contentDescription = "Header",
//                modifier = Modifier.fillMaxSize(),
//                contentScale = ContentScale.FillWidth
            )
            Image(
                painter = painterResource(id = page.imageRes),
                contentDescription = page.title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.FillWidth
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .background(AppTheme.colorScheme.primary)
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = page.title,
                color = AppTheme.colorScheme.onPrimary,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                lineHeight = 30.sp,
                modifier = Modifier.pagerAnimation(pagerState, pageIndex) { pageOffset ->
                    alpha = lerp(1f, 0f, pageOffset.absoluteValue.coerceIn(0f, 1f))
                    scaleX = 1f - pageOffset.absoluteValue.coerceIn(0f, 0.2f)
                    scaleY = 1f - pageOffset.absoluteValue.coerceIn(0f, 0.2f)
                }
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = page.description,
                color = AppTheme.colorScheme.onPrimary.copy(alpha = 0.8f),
                textAlign = TextAlign.Center,
                fontSize = 14.sp,
                modifier = Modifier.pagerAnimation(pagerState, pageIndex) { pageOffset ->
                    alpha = lerp(1f, 0f, pageOffset.absoluteValue.coerceIn(0f, 1f))
                    translationY = size.height * pageOffset.absoluteValue * 0.2f
                }
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

@OptIn(ExperimentalFoundationApi::class, ExperimentalAnimationApi::class)
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
            Text("Skip", color = AppTheme.colorScheme.onPrimary.copy(alpha = 0.8f))
        }
        PageIndicator(pageCount = pagerState.pageCount, currentPage = pagerState.currentPage)
        Button(
            onClick = onNextClicked,
            colors = ButtonDefaults.buttonColors(
                containerColor = AppTheme.colorScheme.onPrimary,
                contentColor = AppTheme.colorScheme.primary
            )
        ) {
            val buttonText = if (pagerState.currentPage == pagerState.pageCount - 1) "Okay" else "Next"
            AnimatedContent(
                targetState = buttonText,
                transitionSpec = { 
                    fadeIn(animationSpec = tween(220, delayMillis = 90)) togetherWith
                            fadeOut(animationSpec = tween(90))
                }, label = "buttonTextAnimation"
            ) { text ->
                Text(text)
            }
        }
    }
}

@Composable
fun PageIndicator(pageCount: Int, currentPage: Int) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(pageCount) { iteration ->
            val isSelected = currentPage == iteration
            val color by animateColorAsState(
                targetValue = if (isSelected) AppTheme.colorScheme.onPrimary else AppTheme.colorScheme.onPrimary.copy(alpha = 0.5f),
                label = "colorAnimation"
            )
            val size by animateDpAsState(
                targetValue = if (isSelected) 10.dp else 8.dp,
                label = "sizeAnimation"
            )
            Box(
                modifier = Modifier
                    .size(size)
                    .clip(CircleShape)
                    .background(color)
            )
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
fun Modifier.pagerAnimation(
    pagerState: PagerState,
    pageIndex: Int,
    transform: GraphicsLayerScope.(pageOffset: Float) -> Unit
) = graphicsLayer {
    val pageOffset = (
            (pagerState.currentPage - pageIndex) + pagerState
                .currentPageOffsetFraction
            ).absoluteValue

    transform(this, pageOffset)
}