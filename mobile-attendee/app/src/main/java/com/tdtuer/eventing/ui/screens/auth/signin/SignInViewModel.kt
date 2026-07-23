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

    override suspend fun onSocialLoginSuccess() {
        saveRememberMeStatusUseCase(rememberMe)
    }

    fun onSignInClick() {
        if (email.isBlank() || password.isBlank()) {
            _authState.value = AuthState.Error("Email and password can't be blank.")
            return
        }

        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val processedEmail = if (email.contains("@")) email else "$email@gmail.com"
            val result = signInUseCase(processedEmail, password)

            if (result.isSuccess) {
                saveRememberMeStatusUseCase(rememberMe)
                _authState.value = AuthState.Success(result.getOrNull()!!)
            } else {
                val errorMessage = result.exceptionOrNull()?.localizedMessage
                    ?: "An unknown error occurred."
                _authState.value = AuthState.Error(errorMessage)
            }
        }
    }
}
