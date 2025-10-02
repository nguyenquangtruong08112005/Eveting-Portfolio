package com.tdtuer.eventing.ui.screens.auth.signup

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.model.User
import com.tdtuer.eventing.domain.usecase.Authentication.SignUpUseCase
import com.tdtuer.eventing.ui.screens.auth.AuthState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SignUpViewModel @Inject constructor(
    private val signUpUseCase: SignUpUseCase
) : ViewModel() {

    // Trạng thái cho các trường nhập liệu
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

    // Trạng thái xác thực (public để UI có thể lắng nghe)
    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState

    // --- Xử lý sự kiện thay đổi giá trị ---
    fun onFullNameChange(value: String) {
        fullName = value
    }

    fun onEmailChange(value: String) {
        email = value
    }

    fun onPasswordChange(value: String) {
        password = value
    }

    fun onConfirmPasswordChange(value: String) {
        confirmPassword = value
    }

    fun onPasswordVisibilityToggle() {
        passwordVisibility = !passwordVisibility
    }

    fun onConfirmPasswordVisibilityToggle() {
        confirmPasswordVisibility = !confirmPasswordVisibility
    }

    // --- Xử lý sự kiện click ---
    fun onSignUpClick() {
        if (password != confirmPassword) {
            _authState.value = AuthState.Error("Mật khẩu không khớp.")
            return
        }

        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val result = signUpUseCase(fullName, email, password, "attendee")
            _authState.value = when {
                result.isSuccess -> AuthState.Success(result.getOrNull()!!)
                else -> AuthState.Error(result.exceptionOrNull()?.message ?: "Lỗi không xác định")
            }
        }
    }

    fun onGoogleLoginClick() {
        // TODO: Implement Google login logic
    }

    fun onFacebookLoginClick() {
        // TODO: Implement Facebook login logic
    }

    fun onSignInLinkClick() {
        // TODO: Navigate to Sign In screen
    }

    fun onBackNavigationClick() {
        // TODO: Handle back navigation
    }
}