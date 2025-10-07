package com.tdtuer.eventing.ui.screens.auth.signin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.usecase.authentication.GetGoogleIdTokenUseCase
import com.tdtuer.eventing.domain.usecase.authentication.SaveRememberMeStatusUseCase
import com.tdtuer.eventing.domain.usecase.authentication.SignInUseCase
import com.tdtuer.eventing.domain.usecase.authentication.SignInWithFacebookUseCase
import com.tdtuer.eventing.domain.usecase.authentication.SignInWithGoogleUseCase
import com.tdtuer.eventing.ui.screens.auth.AuthState
import com.tdtuer.eventing.ui.screens.auth.BaseAuthViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SignInViewModel @Inject constructor(
    private val signInUseCase: SignInUseCase,
    private val saveRememberMeStatusUseCase: SaveRememberMeStatusUseCase,
    signInWithGoogleUseCase: SignInWithGoogleUseCase,
    signInWithFacebookUseCase: SignInWithFacebookUseCase,
    getGoogleIdTokenUseCase: GetGoogleIdTokenUseCase
) : BaseAuthViewModel(signInWithGoogleUseCase, signInWithFacebookUseCase, getGoogleIdTokenUseCase) {

    var email by mutableStateOf("")
        private set
    var password by mutableStateOf("")
        private set
    var passwordVisibility by mutableStateOf(false)
        private set
    var rememberMe by mutableStateOf(true)
        private set

    fun onEmailChange(value: String) {
        email = value
    }

    fun onPasswordChange(value: String) {
        password = value
    }

    fun onPasswordVisibilityToggle() {
        passwordVisibility = !passwordVisibility
    }

    fun onRememberMeChange(value: Boolean) {
        rememberMe = value
    }

    fun onForgotPasswordClick() {
        // Handle forgot password logic
    }

    fun onSignInClick() {
        if (email.isBlank() || password.isBlank()) {
            _authState.value = AuthState.Error("Email và mật khẩu không được để trống.")
            return
        }

        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val result = signInUseCase(email, password)

            if (result.isSuccess) {
                saveRememberMeStatusUseCase(rememberMe)
            }

            _authState.value = when {
                result.isSuccess -> AuthState.Success(result.getOrNull()!!)
                else -> AuthState.Error(result.exceptionOrNull()?.message ?: "Lỗi không xác định")
            }
        }
    }
}
