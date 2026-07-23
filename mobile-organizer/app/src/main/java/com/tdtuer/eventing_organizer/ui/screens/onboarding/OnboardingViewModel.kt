package com.tdtuer.eventing_organizer.ui.screens.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.R
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SetOnboardingCompletedUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// --- Data Model cho một trang Onboarding ---
data class OnboardingPage(
    val imageRes: Int, val title: String, val description: String
)

// --- State của UI ---
data class OnboardingUiState(
    val currentPage: Int = 0,
    val isOnboardingComplete: Boolean = false,
    val pages: List<OnboardingPage> = emptyList()
)

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val setOnboardingCompletedUseCase: SetOnboardingCompletedUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    init {
        loadOnboardingPages()
    }

    private fun loadOnboardingPages() {
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
        _uiState.update { it.copy(pages = pages) }
    }

    fun onNextClicked() {
        val currentPage = _uiState.value.currentPage
        val totalPages = _uiState.value.pages.size

        if (currentPage < totalPages - 1) {
            _uiState.update { it.copy(currentPage = currentPage + 1) }
        } else {
            completeOnboarding()
        }
    }

    fun onSkipClicked() {
        completeOnboarding()
    }

    fun onPageChanged(page: Int) {
        _uiState.update { it.copy(currentPage = page) }
    }

    private fun completeOnboarding() {
        viewModelScope.launch {
            setOnboardingCompletedUseCase()
            _uiState.update { it.copy(isOnboardingComplete = true) }
        }
    }
}
