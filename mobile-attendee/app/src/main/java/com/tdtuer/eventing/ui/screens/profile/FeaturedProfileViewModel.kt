package com.tdtuer.eventing.ui.screens.profile

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.data.repository.UserRepository
import com.tdtuer.eventing.domain.model.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.joinAll
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
    private val eventRepository: EventRepository,
    private val userRepository: UserRepository
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

            // Gọi song song 2 API: Lấy chi tiết Profile & Lấy User để check follow
            val profileJob = launch {
                eventRepository.getFeaturedProfileById(profileId).collect { result ->
                    if (result is Result.Success) {
                        _uiState.update { it.copy(profile = result.data) }
                    } else if (result is Result.Failure) {
                        _uiState.update { it.copy(error = result.exception.message) }
                    }
                }
            }

            val userJob = launch {
                userRepository.getUserProfile().collect { result ->
                    if (result is Result.Success) {
                        val user = result.data
                        // Kiểm tra xem profileId này có trong danh sách user đã follow không
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
        val currentProfile = currentState.profile ?: return // Nếu chưa load xong profile thì return

        if (currentState.isFollowProcessing) return

        viewModelScope.launch {
            _uiState.update { it.copy(isFollowProcessing = true) }

            val isCurrentlyFollowing = currentState.isFollowing

            // Gọi API Follow hoặc Unfollow
            val result = if (isCurrentlyFollowing) {
                userRepository.unfollowProfile(profileId)
            } else {
                userRepository.followProfile(profileId)
            }

            if (result is Result.Success) {
                // --- LOGIC CẬP NHẬT UI LOCAL ---

                // 1. Tính toán số lượng mới
                // Nếu đang follow -> Unfollow -> Giảm 1
                // Nếu chưa follow -> Follow -> Tăng 1
                val change = if (isCurrentlyFollowing) -1 else 1
                val currentCount = currentProfile.followerCount ?: 0
                val newCount = (currentCount + change).coerceAtLeast(0) // Đảm bảo không âm

                // 2. Cập nhật object Profile mới
                val updatedProfile = currentProfile.copy(followerCount = newCount)

                // 3. Cập nhật State
                _uiState.update {
                    it.copy(
                        isFollowing = !isCurrentlyFollowing, // Đảo ngược trạng thái nút bấm
                        profile = updatedProfile,            // Cập nhật số lượng hiển thị
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