package com.tdtuer.eventing_organizer.ui.screens.profile

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.data.network.model.OrganizerProfileResponse
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.usecase.organizer.GetOrganizerProfileUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileData(
    val id: String = "",
    val name: String = "", // Tên Organizer/Company
    val avatarUrl: String = "",
    val followersCount: Int = 0,
    val rating: Double = 0.0,
    // Thông tin doanh nghiệp chi tiết
    val companyName: String = "",
    val description: String = "",
    val taxCode: String = "",
    val website: String = "" // Nếu có
)

@HiltViewModel
class MyProfileViewModel @Inject constructor(
    private val getOrganizerProfileUseCase: GetOrganizerProfileUseCase
) : ViewModel() {

    private val _profileData = mutableStateOf(ProfileData())
    val profileData: State<ProfileData> = _profileData

    private val _isLoading = mutableStateOf(false)
    val isLoading: State<Boolean> = _isLoading

    fun loadProfile() {
        viewModelScope.launch {
            _isLoading.value = true
            getOrganizerProfileUseCase().collect { result ->
                _isLoading.value = false
                when (result) {
                    is Result.Success -> {
                        val data = result.data
                        _profileData.value = data.toProfileData()
                    }

                    is Result.Failure -> {
                        // Xử lý lỗi (ví dụ: in log)
                    }

                    is Result.Loading -> {
                        _isLoading.value = true
                    }
                }
            }
        }
    }

    private fun OrganizerProfileResponse.toProfileData(): ProfileData {
        return ProfileData(
            id = this.id,
            name = this.name,
            avatarUrl = this.avatarUrl ?: "",
            followersCount = this.followersCount,
            rating = this.rating,
            companyName = this.organizerInfo?.companyName ?: "",
            description = this.organizerInfo?.description ?: "",
            taxCode = this.organizerInfo?.taxCode ?: "",
            website = this.organizerInfo?.website ?: ""
        )
    }
}