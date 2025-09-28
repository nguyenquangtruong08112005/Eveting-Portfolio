package com.tdtuer.eventing.ui.screens.onboarding

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.pager.PagerState
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.R // Assuming R class is available
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch

// --- Data Model cho một trang Onboarding ---
data class OnboardingPage(
    val imageRes: Int,
    val title: String,
    val description: String
)

@OptIn(ExperimentalFoundationApi::class)
class OnboardingViewModel : ViewModel() {

    val pages = listOf(
        OnboardingPage(
            imageRes = R.drawable.default_pfp, // Replace with actual onboarding images
            title = "Explore Upcoming and Nearby Events",
            description = "In publishing and graphic design, Lorem is a placeholder text commonly"
        ),
        OnboardingPage(
            imageRes = R.drawable.default_pfp, // Replace with actual onboarding images
            title = "Web Have Modern Events Calendar Feature",
            description = "In publishing and graphic design, Lorem is a placeholder text commonly"
        ),
        OnboardingPage(
            imageRes = R.drawable.default_pfp, // Replace with actual onboarding images
            title = "To Look Up More Events or Activities Nearby By Map",
            description = "In publishing and graphic design, Lorem is a placeholder text commonly"
        )
    )

    private val _onboardingComplete = MutableSharedFlow<Unit>(replay = 0)
    val onboardingComplete = _onboardingComplete.asSharedFlow()

    fun onNextClicked(pagerState: PagerState) {
        viewModelScope.launch {
            if (pagerState.currentPage < pages.size - 1) {
                pagerState.animateScrollToPage(pagerState.currentPage + 1)
            } else {
                // Đã đến trang cuối, xử lý chuyển đến màn hình chính
                _onboardingComplete.emit(Unit)
                println("Onboarding complete, navigating to home...")
            }
        }
    }

    fun onSkipClicked() {
        viewModelScope.launch {
            // Xử lý chuyển đến màn hình chính
            _onboardingComplete.emit(Unit)
            println("Skip clicked, navigating to home...")
        }
    }
}
