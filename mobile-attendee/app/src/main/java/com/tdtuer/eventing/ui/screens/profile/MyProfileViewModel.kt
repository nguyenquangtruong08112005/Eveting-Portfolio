package com.tdtuer.eventing.ui.screens.profile

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R // Assuming R class is available

// Data class for an interest item if needed, or manage directly in ViewModel
data class ProfileInterest(val name: String, val color: Color, val backgroundColor: Color)

data class ProfileData(
    val profilePictureRes: Int = R.drawable.default_pfp,
    val userName: String = "Ashfak Sayem",
    val followingCount: Int = 350,
    val followersCount: Int = 346,
    val aboutMe: String = "Enjoy your favorite dishe and a lovely your friends and family and have a great time. Food from local food trucks will be available for purchase. Read More",
    val interests: List<ProfileInterest> = listOf(
        ProfileInterest("Games Online", Color(0xFF6A5AE0), Color(0xFF6A5AE0).copy(alpha = 0.1f)),
        ProfileInterest("Concert", Color(0xFFF0635A), Color(0xFFF0635A).copy(alpha = 0.1f)),
        ProfileInterest("Music", Color(0xFFF59762), Color(0xFFF59762).copy(alpha = 0.1f)),
        ProfileInterest("Art", Color(0xFF8436E0), Color(0xFF8436E0).copy(alpha = 0.1f)),
        ProfileInterest("Movie", Color(0xFF29D697), Color(0xFF29D697).copy(alpha = 0.1f)),
        ProfileInterest("Others", Color(0xFF46CDFB), Color(0xFF46CDFB).copy(alpha = 0.1f))
    )
)

class MyProfileViewModel : ViewModel() {

    private val _profileData = mutableStateOf(ProfileData()) // Initialize with default/placeholder data
    val profileData: State<ProfileData> = _profileData

    // In a real app, you would load this data from a repository or user service
    // init {
    //     loadUserProfile()
    // }

    // private fun loadUserProfile() {
    //     // viewModelScope.launch {
    //     //     _profileData.value = userRepository.getCurrentUserProfile()
    //     // }
    // }

    fun onBackNavigationClick() {
        // TODO: Implement back navigation logic
        println("Back navigation clicked from MyProfileScreen")
    }

    fun onEditProfileClick() {
        // TODO: Implement navigation to EditProfileScreen or show edit dialog
        println("Edit Profile clicked")
    }

    fun onChangeInterestClick() {
        // TODO: Implement navigation to change interest screen or show dialog
        println("Change Interest clicked")
    }
}
