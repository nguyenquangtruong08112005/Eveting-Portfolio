package com.tdtuer.eventing.ui.screens.profile

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.User
import com.tdtuer.eventing.domain.usecase.user.GetUserProfileUseCase
import com.tdtuer.eventing.helpers.formatTimestampToDay
import com.tdtuer.eventing.helpers.formatTimestampToMonth
import com.tdtuer.eventing.helpers.formatTimestampToYear
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.random.Random

data class ProfileInterest(val name: String, val color: Color, val backgroundColor: Color)

data class JoinedEventItem(
    val id: String,
    val title: String,
    val date: String,
    val imageUrl: String
)

data class ProfileData(
    val id: String = "",
    val profilePictureUrl: String = "",
    val coverPhotoUrl: String = "",
    val userName: String = "",
    val email: String = "",
    val isOrganizer: Boolean = false,
    val followingCount: Int = 0,
    val followersCount: Int = 0,
    val aboutMe: String = "",
    val interests: List<ProfileInterest> = emptyList(),
    val joinedEvents: List<JoinedEventItem> = emptyList()
)

@HiltViewModel
class MyProfileViewModel @Inject constructor(
    private val getUserProfileUseCase: GetUserProfileUseCase
) : ViewModel() {

    private val _profileData = mutableStateOf(ProfileData())
    val profileData: State<ProfileData> = _profileData

    private val _isLoading = mutableStateOf(false)
    val isLoading: State<Boolean> = _isLoading

    private val _selectedTabIndex = mutableStateOf(0)
    val selectedTabIndex: State<Int> = _selectedTabIndex

    init {
        // loadUserProfile() // Có thể gọi ở đây hoặc gọi từ UI (LifecycleEvent)
    }

    fun loadUserProfile() {
        viewModelScope.launch {
            _isLoading.value = true
            getUserProfileUseCase().collect { result ->
                when (result) {
                    is Result.Success -> {
                        _isLoading.value = false
                        _profileData.value = result.data.toProfileData()
                    }
                    is Result.Failure -> {
                        _isLoading.value = false
                        println("Error loading profile: ${result.exception.message}")
                    }
                    is Result.Loading -> _isLoading.value = true
                }
            }
        }
    }

    fun onTabSelected(index: Int) {
        _selectedTabIndex.value = index
    }

    // Mapper: Domain User -> UI ProfileData
    private fun User.toProfileData(): ProfileData {
        return ProfileData(
            id = this.id,
            profilePictureUrl = this.profilePicUrl,
            coverPhotoUrl = this.coverPhotoUrl,
            userName = this.name,
            email = this.email,
            isOrganizer = this.isOrganizer,
            followingCount = this.followingCount,
            followersCount = this.followersCount,
            aboutMe = this.bio.ifEmpty { "No about me info yet." },
            interests = this.interests.map { interestName ->
                val color = generateRandomColor()
                ProfileInterest(interestName, color, color.copy(alpha = 0.1f))
            },
            // Map danh sách sự kiện đã tham gia từ Domain
            joinedEvents = this.joinedEvents.map { event ->
                val dateStr = "${formatTimestampToDay(event.date)} ${formatTimestampToMonth(event.date)}, ${formatTimestampToYear(event.date)}"
                JoinedEventItem(
                    id = event.id,
                    title = event.name,
                    date = dateStr,
                    imageUrl = event.imageUrl
                )
            }
        )
    }

    private fun generateRandomColor(): Color {
        val colors = listOf(
            Color(0xFF6A5AE0), Color(0xFFF0635A), Color(0xFFF59762),
            Color(0xFF8436E0), Color(0xFF29D697), Color(0xFF46CDFB)
        )
        return colors.random()
    }
}