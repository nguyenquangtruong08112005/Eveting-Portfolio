package com.tdtuer.eventing.ui.screens.onboarding

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.pager.PagerState
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch

// --- Data Model cho một trang Onboarding ---
data class OnboardingPage(
    val imageRes: Int, val title: String, val description: String
)

@OptIn(ExperimentalFoundationApi::class)
class OnboardingViewModel : ViewModel() {

    // Thay thế bằng các ảnh thật của bạn
    val pages = listOf(
        OnboardingPage(
            imageRes = R.drawable.group_34057,
            title = "Discover Events Near You",
            description = "Easily find exciting events happening around you. From concerts and workshops to local meetups, everything is just a tap away."
        ),
        OnboardingPage(
            imageRes = R.drawable.image_81_1,
            title = "Smart & Modern Event Calendar",
            description = "Stay on top of your plans with our intuitive calendar. Save events, set reminders, and never miss a moment."
        ),
        OnboardingPage(
            imageRes = R.drawable.image_79_1,
            title = "Explore with Interactive Maps",
            description = "Use our interactive map to see what's happening in your area. A fun and visual way to discover your next adventure."
        )
    )
    // --- CÁC THAY ĐỔI BẮT ĐẦU TỪ ĐÂY ---

    // 1. Dùng để yêu cầu UI chuyển trang
    private val _navigateToPage = MutableSharedFlow<Int>()
    val navigateToPage = _navigateToPage.asSharedFlow()

    // 2. Dùng để thông báo Onboarding hoàn tất
    private val _onboardingComplete = MutableSharedFlow<Unit>(replay = 1)
    val onboardingComplete = _onboardingComplete.asSharedFlow()

    // 3. Hàm onNextClicked giờ chỉ nhận trang hiện tại, không nhận cả PagerState
    fun onNextClicked(currentPage: Int) {
        viewModelScope.launch {
            if (currentPage < pages.size - 1) {
                // Yêu cầu UI cuộn đến trang tiếp theo
                _navigateToPage.emit(currentPage + 1)
            } else {
                // Đã đến trang cuối, yêu cầu hoàn tất
                _onboardingComplete.emit(Unit)
            }
        }
    }

    fun onSkipClicked() {
        viewModelScope.launch {
            // Phát sự kiện hoàn thành để chuyển màn hình
            _onboardingComplete.emit(Unit)
        }
    }
}
