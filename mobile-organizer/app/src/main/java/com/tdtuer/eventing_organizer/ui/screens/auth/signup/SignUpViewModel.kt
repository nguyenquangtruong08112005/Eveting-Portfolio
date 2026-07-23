package com.tdtuer.eventing_organizer.ui.screens.auth.signup

import com.tdtuer.eventing_organizer.helpers.UserFacingErrors
import com.tdtuer.eventing_organizer.helpers.toUserMessage

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.data.auth.UserCollisionException
import com.tdtuer.eventing_organizer.data.network.model.RegisterOrganizerRequest
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.model.User
import com.tdtuer.eventing_organizer.domain.usecase.authentication.GetGoogleIdTokenUseCase
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SignInUseCase // <-- THÊM IMPORT
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SignInWithFacebookUseCase
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SignInWithGoogleUseCase
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SignUpUseCase
import com.tdtuer.eventing_organizer.ui.screens.auth.AuthState
import com.tdtuer.eventing_organizer.ui.screens.auth.BaseAuthViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SignUpViewModel @Inject constructor(
    private val signUpUseCase: SignUpUseCase,
    private val signInUseCase: SignInUseCase, // <-- INJECT THÊM: Để đăng nhập nếu tài khoản đã tồn tại
    private val eventRepository: EventRepository,
    signInWithGoogleUseCase: SignInWithGoogleUseCase,
    signInWithFacebookUseCase: SignInWithFacebookUseCase,
    getGoogleIdTokenUseCase: GetGoogleIdTokenUseCase
) : BaseAuthViewModel(signInWithGoogleUseCase, signInWithFacebookUseCase, getGoogleIdTokenUseCase) {

    // --- Các trường cơ bản ---
    var fullName by mutableStateOf("")
        private set
    var email by mutableStateOf("")
        private set
    var password by mutableStateOf("")
        private set
    var confirmPassword by mutableStateOf("")
        private set
    var passwordVisibility by mutableStateOf(false)
        private set
    var confirmPasswordVisibility by mutableStateOf(false)
        private set

    // --- Các trường cho Organizer ---
    var isOrganizerMode by mutableStateOf(true)
        private set
    var companyName by mutableStateOf("")
        private set
    var taxCode by mutableStateOf("")
        private set
    var website by mutableStateOf("")
        private set
    var description by mutableStateOf("")
        private set

    // --- Setters ---
    fun onFullNameChange(value: String) { fullName = value }
    fun onEmailChange(value: String) { email = value }
    fun onPasswordChange(value: String) { password = value }
    fun onConfirmPasswordChange(value: String) { confirmPassword = value }
    fun onPasswordVisibilityToggle() { passwordVisibility = !passwordVisibility }
    fun onConfirmPasswordVisibilityToggle() { confirmPasswordVisibility = !confirmPasswordVisibility }

    // Setters cho Organizer
    fun onOrganizerModeChange(isOrganizer: Boolean) { isOrganizerMode = isOrganizer }
    fun onCompanyNameChange(value: String) { companyName = value }
    fun onTaxCodeChange(value: String) { taxCode = value }
    fun onWebsiteChange(value: String) { website = value }
    fun onDescriptionChange(value: String) { description = value }

    // --- Logic Đăng Ký / Nâng Cấp ---
    fun onSignUpClick() {
        // 1. Validate cơ bản
        if (password != confirmPassword) {
            _authState.value = AuthState.Error("Passwords do not match.")
            return
        }
        if (fullName.isBlank() || email.isBlank() || password.isBlank()) {
            _authState.value = AuthState.Error("Please fill in all required fields.")
            return
        }

        // 2. Validate Organizer
        if (isOrganizerMode && companyName.isBlank()) {
            _authState.value = AuthState.Error("Company Name is required for Organizers.")
            return
        }

        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val processedEmail = if (email.contains("@")) email else "$email@gmail.com"

            // Bước 1: Thử tạo tài khoản mới
            val signUpResult = signUpUseCase(fullName, processedEmail, password, "attendee")

            if (signUpResult.isSuccess) {
                // CASE A: Tài khoản chưa tồn tại -> Tạo mới thành công
                val user = signUpResult.getOrNull()!!
                handleOrganizerRegistration(user)
            } else {
                val exception = signUpResult.exceptionOrNull()

                // CASE B: Tài khoản đã tồn tại (Email collision) VÀ đang muốn làm Organizer
                if (exception is UserCollisionException && isOrganizerMode) {
                    // Thử đăng nhập để xác thực quyền sở hữu tài khoản
                    val signInResult = signInUseCase(processedEmail, password)

                    if (signInResult.isSuccess) {
                        val user = signInResult.getOrNull()!!
                        // Đăng nhập thành công -> Gọi API để nâng cấp
                        handleOrganizerRegistration(user)
                    } else {
                        // Sai mật khẩu hoặc lỗi khác
                        _authState.value = AuthState.Error("Account exists but login failed. Please check your password to upgrade account.")
                    }
                } else {
                    // Các lỗi đăng ký thông thường (Password yếu, email sai format...)
                    val errorMessage = exception?.message ?: "An unknown error occurred."
                    _authState.value = AuthState.Error(errorMessage)
                }
            }
        }
    }

    // Hàm tách riêng để gọi API Register Organizer (Dùng chung cho cả Tạo mới và Nâng cấp)
    private suspend fun handleOrganizerRegistration(user: User) {
        if (isOrganizerMode) {
            val orgRequest = RegisterOrganizerRequest(
                companyName = companyName,
                taxCode = taxCode,
                website = website,
                description = description
            )

            // Gọi API Backend để update role và info
            val orgResult = eventRepository.registerOrganizer(orgRequest)

            if (orgResult is Result.Success) {
                // Thành công: Cập nhật state UI
                _authState.value = AuthState.Success(user.copy(isOrganizer = true))
            } else {
                // Lỗi API: Vẫn cho user đăng nhập nhưng báo lỗi phần Organizer
                val errorMsg = (orgResult as Result.Failure).exception.toUserMessage()
                _authState.value = AuthState.Error("Account verified but Organizer registration failed: $errorMsg")
                //Log.d("SignUpViewModel", "Organizer registration failed: $errorMsg")
            }
        } else {
            // Không phải Organizer -> Login luôn
            _authState.value = AuthState.Success(user)
        }
    }
}