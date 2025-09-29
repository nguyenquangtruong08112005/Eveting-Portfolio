package com.tdtuer.eventing.ui.screens.auth.signup

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.model.User
import com.tdtuer.eventing.domain.usecase.SignUpUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SignUpViewModel @Inject constructor(
    private val signUpUseCase: SignUpUseCase
) : ViewModel() {
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

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState = _authState.asStateFlow()

    fun onFullNameChange(newName: String) {
        fullName = newName
    }

    fun onEmailChange(newEmail: String) {
        email = newEmail
    }

    fun onPasswordChange(newPassword: String) {
        password = newPassword
    }

    fun onConfirmPasswordChange(newConfirmPassword: String) {
        confirmPassword = newConfirmPassword
    }

    fun onPasswordVisibilityToggle() {
        passwordVisibility = !passwordVisibility
    }

    fun onConfirmPasswordVisibilityToggle() {
        confirmPasswordVisibility = !confirmPasswordVisibility
    }

    fun onSignUpClick() {
        if (password != confirmPassword) {
            _authState.value = AuthState.Error("Passwords do not match")
            return
        }
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val result =
                signUpUseCase(email, password, "attendee")  // Role mặc định, sửa nếu có UI cho role
            _authState.value =
                if (result.isSuccess) AuthState.Success(result.getOrNull()!!) else AuthState.Error(
                    result.exceptionOrNull()?.message ?: "Sign up failed"
                )
        }
    }

    fun onGoogleLoginClick() {
        // TODO: Google login
        println("Google Login Clicked")
    }

    fun onFacebookLoginClick() {
        // TODO: Facebook login
        println("Facebook Login Clicked")
    }

    fun onSignInLinkClick() {
        // TODO: Navigate to Sign In
        println("Navigate to Sign In screen")
    }

    fun onBackNavigationClick() {
        // TODO: Back navigation
        println("Back navigation Clicked")
    }
}

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val user: User) : AuthState()
    data class Error(val message: String) : AuthState()
}