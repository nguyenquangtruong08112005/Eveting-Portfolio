package com.tdtuer.eventing.ui.screens.profile

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.user.FollowProfileUseCase
import com.tdtuer.eventing.domain.usecase.user.GetFeaturedProfileByIdUseCase
import com.tdtuer.eventing.domain.usecase.user.GetUserProfileUseCase
import com.tdtuer.eventing.domain.usecase.user.UnfollowProfileUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FeaturedProfileUiState(
    val isLoading: Boolean = false,
    val profile: FeaturedProfileDto? = null,
    val isFollowing: Boolean = false,
    val isFollowProcessing: Boolean = false, // Loading khi ấn nút follow
    val error: String? = null
)

@HiltViewModel
class FeaturedProfileViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val getFeaturedProfileByIdUseCase: GetFeaturedProfileByIdUseCase,
    private val getUserProfileUseCase: GetUserProfileUseCase, // Đã có sẵn
    private val followProfileUseCase: FollowProfileUseCase,
    private val unfollowProfileUseCase: UnfollowProfileUseCase
) : ViewModel() {

    private val profileId: String = savedStateHandle["profileId"] ?: ""

    private val _uiState = MutableStateFlow(FeaturedProfileUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        if (profileId.isBlank()) {
            _uiState.update { it.copy(error = "Invalid Profile ID") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // Gọi song song 2 UseCase
            val profileJob = launch {
                getFeaturedProfileByIdUseCase(profileId).collect { result ->
                    if (result is Result.Success) {
                        _uiState.update { it.copy(profile = result.data) }
                    } else if (result is Result.Failure) {
                        _uiState.update { it.copy(error = result.exception.message) }
                    }
                }
            }

            val userJob = launch {
                getUserProfileUseCase().collect { result ->
                    if (result is Result.Success) {
                        val user = result.data
                        val isFollowing = user.followedProfileIds.contains(profileId)
                        _uiState.update { it.copy(isFollowing = isFollowing) }
                    }
                }
            }

            joinAll(profileJob, userJob)
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun toggleFollow() {
        val currentState = _uiState.value
        val currentProfile = currentState.profile ?: return

        if (currentState.isFollowProcessing) return

        viewModelScope.launch {
            _uiState.update { it.copy(isFollowProcessing = true) }

            val isCurrentlyFollowing = currentState.isFollowing

            // Sử dụng Follow/Unfollow UseCase
            val result = if (isCurrentlyFollowing) {
                unfollowProfileUseCase(profileId)
            } else {
                followProfileUseCase(profileId)
            }

            if (result is Result.Success) {
                val change = if (isCurrentlyFollowing) -1 else 1
                val currentCount = currentProfile.followerCount ?: 0
                val newCount = (currentCount + change).coerceAtLeast(0)

                val updatedProfile = currentProfile.copy(followerCount = newCount)

                _uiState.update {
                    it.copy(
                        isFollowing = !isCurrentlyFollowing,
                        profile = updatedProfile,
                        isFollowProcessing = false
                    )
                }
            } else {
                val err = (result as Result.Failure).exception.message
                _uiState.update { it.copy(isFollowProcessing = false, error = err) }
            }
        }
    }
}