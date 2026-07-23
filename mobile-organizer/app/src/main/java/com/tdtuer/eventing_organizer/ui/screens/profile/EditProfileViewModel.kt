package com.tdtuer.eventing_organizer.ui.screens.editprofile

import com.tdtuer.eventing_organizer.helpers.UserFacingErrors
import com.tdtuer.eventing_organizer.helpers.toUserMessage

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.constants.Constraints
import com.tdtuer.eventing_organizer.data.network.model.UpdateOrganizerProfileRequest
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.usecase.organizer.GetOrganizerProfileUseCase
import com.tdtuer.eventing_organizer.domain.usecase.organizer.UpdateOrganizerProfileUseCase
import com.tdtuer.eventing_organizer.domain.usecase.user.UploadImageUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EditProfileUiState(
    val avatarUrl: String = "",
    val name: String = "",          // Tên hiển thị
    val companyName: String = "",   // Tên công ty
    val description: String = "",   // Mô tả
    val website: String = "",       // Website
    val taxCode: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class EditProfileViewModel @Inject constructor(
    private val getOrganizerProfileUseCase: GetOrganizerProfileUseCase,
    private val updateOrganizerProfileUseCase: UpdateOrganizerProfileUseCase,
    private val uploadImageUseCase: UploadImageUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(EditProfileUiState())
    val uiState = _uiState.asStateFlow()

    private var currentUserId: String = "" // Để dùng cho path upload ảnh

    init {
        loadProfile()
    }

    private fun loadProfile() {
        viewModelScope.launch {
            // _uiState.update { it.copy(isLoading = true) } // <-- Có thể bỏ dòng này vì Result.Loading sẽ xử lý

            getOrganizerProfileUseCase().collect { result ->
                when (result) {
                    is Result.Loading -> {
                        // Khi đang loading, chỉ hiện vòng xoay, không báo lỗi
                        _uiState.update { it.copy(isLoading = true, errorMessage = null) }
                    }
                    is Result.Success -> {
                        val data = result.data
                        currentUserId = data.id
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                avatarUrl = data.avatarUrl ?: "",
                                name = data.name,
                                companyName = data.organizerInfo?.companyName ?: "",
                                description = data.organizerInfo?.description ?: "",
                                taxCode = data.organizerInfo?.taxCode ?: "",
                                website = data.organizerInfo?.website ?: ""
                            )
                        }
                    }
                    is Result.Failure -> {
                        // Chỉ khi thực sự thất bại mới báo lỗi
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                errorMessage = "Failed to load profile: ${UserFacingErrors.toUserMessage(result.exception)}"
                            )
                        }
                    }
                }
            }
        }
    }

    // --- Field Updates ---
    fun onNameChange(v: String) {
        _uiState.update { it.copy(name = v) }
    } // Tạm thời name trong OrganizerProfileResponse là tên hiển thị

    fun onCompanyNameChange(v: String) {
        _uiState.update { it.copy(companyName = v) }
    }

    fun onDescriptionChange(v: String) {
        _uiState.update { it.copy(description = v) }
    }

    fun onWebsiteChange(v: String) {
        _uiState.update { it.copy(website = v) }
    }

    fun onTaxCodeChange(v: String) {
        _uiState.update { it.copy(taxCode = v) }
    }

    // --- Upload Avatar ---
    fun onAvatarSelected(uri: Uri) {
        if (currentUserId.isEmpty()) return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val path =
                "${Constraints.PATH_USERS}/$currentUserId/avatar_${System.currentTimeMillis()}.jpg"
            val result = uploadImageUseCase(uri, path)
            if (result is Result.Success) {
                _uiState.update { it.copy(isLoading = false, avatarUrl = result.data) }
            } else {
                _uiState.update { it.copy(isLoading = false, errorMessage = "Upload failed") }
            }
        }
    }

    // --- Save Changes ---
    fun onSaveChangesClick(onSuccess: () -> Unit) {
        val state = _uiState.value
        val request = UpdateOrganizerProfileRequest(
            companyName = state.companyName,
            description = state.description,
            website = state.website,
            avatarUrl = state.avatarUrl,
            taxCode = state.taxCode
        )

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val result = updateOrganizerProfileUseCase(request)

            if (result is Result.Success) {
                _uiState.update { it.copy(isLoading = false) }
                onSuccess()
            } else {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = UserFacingErrors.toUserMessage((result as Result.Failure).exception)
                    )
                }
            }
        }
    }
}