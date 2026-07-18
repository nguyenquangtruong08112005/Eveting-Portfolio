package com.tdtuer.eventing.ui.screens.editprofile

import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.constants.Constraints
import com.tdtuer.eventing.data.network.model.UpdateUserRequest
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.user.GetUserProfileUseCase
import com.tdtuer.eventing.domain.usecase.user.UpdateUserProfileUseCase
import com.tdtuer.eventing.domain.usecase.user.UploadImageUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject

data class EditProfileUiState(
    val avatarUrl: String = "",
    val coverUrl: String = "",
    val fullName: String = "",
    val bio: String = "",
    val dateOfBirth: Long? = null,
    val dateOfBirthString: String = "",
    val location: String = "",
    val interestedEvents: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class EditProfileViewModel @Inject constructor(
    private val getUserProfileUseCase: GetUserProfileUseCase,
    private val updateUserProfileUseCase: UpdateUserProfileUseCase,
    private val uploadImageUseCase: UploadImageUseCase // Inject UseCase Upload
) : ViewModel() {

    private val _uiState = MutableStateFlow(EditProfileUiState())
    val uiState = _uiState.asStateFlow()

    private val _showDatePicker = MutableStateFlow(false)
    val showDatePicker = _showDatePicker.asStateFlow()

    private var currentUserId: String = ""

    init {
        loadUserProfile()
    }

    private fun loadUserProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            getUserProfileUseCase().collect { result ->
                if (result is Result.Success) {
                    val user = result.data
                    currentUserId = user.id
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            avatarUrl = user.profilePicUrl, // Load Avatar hiện tại
                            coverUrl = user.coverPhotoUrl,  // Load Cover hiện tại
                            fullName = user.name,
                            bio = user.bio,
                            dateOfBirth = if (user.birthDate > 0) user.birthDate else null,
                            dateOfBirthString = if (user.birthDate > 0) formatDate(user.birthDate) else "",
                            location = user.address,
                            interestedEvents = user.interests.joinToString(", ")
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = "Failed to load profile"
                        )
                    }
                }
            }
        }
    }

    // --- UPLOAD LOGIC (Avatar & Cover) ---

    // 1. Hàm xử lý khi chọn Avatar từ thư viện
    fun onAvatarSelected(uri: Uri) {
        uploadImage(uri, "avatar") { url ->
            _uiState.update { it.copy(avatarUrl = url) }
        }
    }

    // 2. Hàm xử lý khi chọn Cover từ thư viện
    fun onCoverSelected(uri: Uri) {
        uploadImage(uri, "cover") { url ->
            _uiState.update { it.copy(coverUrl = url) }
        }
    }

    // Hàm chung để upload ảnh
    private fun uploadImage(uri: Uri, type: String, onSuccess: (String) -> Unit) {
        if (currentUserId.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // Tạo đường dẫn sạch: users/{userId}/avatar.jpg hoặc users/{userId}/cover.jpg
            // Dùng tên cố định (avatar.jpg) để ghi đè ảnh cũ, tiết kiệm dung lượng
            // Hoặc dùng timestamp nếu muốn giữ lịch sử. Ở đây tôi dùng timestamp để tránh cache client.
            val fileName = "${type}_${System.currentTimeMillis()}.jpg"
            val folder = if (type == "avatar") Constraints.PATH_AVATAR else Constraints.PATH_COVER

            val storagePath = "${Constraints.PATH_USERS}/$currentUserId/$folder/$fileName"

            val result = uploadImageUseCase(uri, storagePath)
            _uiState.update { it.copy(isLoading = false) }

            when (result) {
                is Result.Success -> {
                    onSuccess(result.data) // Trả về URL ảnh mới
                    //Log.d("EditProfile", "Upload $type success: ${result.data}")
                }

                is Result.Failure -> {
                    _uiState.update {
                        it.copy(
                            errorMessage = com.tdtuer.eventing.helpers.UserFacingErrors.toUserMessage(
                                result.exception
                            )
                        )
                    }
                    //Log.e("EditProfile", "Upload failed", result.exception)
                }

                else -> {}
            }
        }
    }

    // --- Field Updates ---
    fun onFullNameChange(value: String) {
        _uiState.update { it.copy(fullName = value) }
    }

    fun onBioChange(value: String) {
        _uiState.update { it.copy(bio = value) }
    }

    fun onLocationChange(value: String) {
        _uiState.update { it.copy(location = value) }
    }

    fun onInterestsChange(value: String) {
        _uiState.update { it.copy(interestedEvents = value) }
    }

    // --- Date Picker ---
    fun onDateOfBirthClick() {
        _showDatePicker.value = true
    }

    fun onDatePickerDismiss() {
        _showDatePicker.value = false
    }

    fun onDateSelected(dateMillis: Long?) {
        dateMillis?.let { millis ->
            _uiState.update {
                it.copy(
                    dateOfBirth = millis,
                    dateOfBirthString = formatDate(millis)
                )
            }
        }
        _showDatePicker.value = false
    }

    // --- Save Changes ---
    fun onSaveChangesClick(onSuccess: () -> Unit) {
        val currentState = _uiState.value
        val interestsList =
            currentState.interestedEvents.split(",").map { it.trim() }.filter { it.isNotEmpty() }

        // Tạo Request gửi lên Server
        val request = UpdateUserRequest(
            name = currentState.fullName,
            aboutMe = currentState.bio,
            address = currentState.location,
            birthDate = currentState.dateOfBirth,
            interests = interestsList,
            profilePicUrl = currentState.avatarUrl, // Gửi URL Avatar mới nhất
            coverPhotoUrl = currentState.coverUrl  // Gửi URL Cover mới nhất
        )

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            updateUserProfileUseCase(request).collect { result ->
                _uiState.update { it.copy(isLoading = false) }
                when (result) {
                    is Result.Success -> onSuccess()
                    is Result.Failure -> {
                        _uiState.update {
                            it.copy(
                                errorMessage = com.tdtuer.eventing.helpers.UserFacingErrors.toUserMessage(
                                    result.exception
                                )
                            )
                        }
                    }

                    else -> {}
                }
            }
        }
    }

    private fun formatDate(millis: Long): String {
        return SimpleDateFormat("dd MMM, yyyy", Locale.ENGLISH).format(Date(millis))
    }
}