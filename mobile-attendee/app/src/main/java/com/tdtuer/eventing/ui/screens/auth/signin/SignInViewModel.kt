package com.tdtuer.eventing.ui.screens.auth.signin

import android.content.Context
import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.usecase.authentication.SignInUseCase
import com.tdtuer.eventing.ui.screens.auth.AuthState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SignInViewModel @Inject constructor(
    private val signInUseCase: SignInUseCase
) : ViewModel() {

    var email by mutableStateOf("")
        private set
    var password by mutableStateOf("")
        private set
    var passwordVisibility by mutableStateOf(false)
        private set
    var rememberMe by mutableStateOf(false)
        private set

    fun onEmailChange(newEmail: String) {
        email = newEmail
    }

    fun onPasswordChange(newPassword: String) {
        password = newPassword
    }

    fun onPasswordVisibilityToggle() {
        passwordVisibility = !passwordVisibility
    }

    fun onRememberMeChange(isChecked: Boolean) {
        rememberMe = isChecked
    }

    fun onSignInClick() {
        // TODO: Implement actual sign-in logic
        println("Sign In Clicked: Email=$email, Password=$password, RememberMe=$rememberMe")
    }

    fun onForgotPasswordClick() {
        Log.d("SignInViewModel", "Forgot Password clicked")
        // TODO: Navigate to Forgot Password screen
    }

    fun onGoogleLoginClick() {
        Log.d("SignInViewModel", "Google Login clicked")
        // TODO: Implement Google Sign-In
    }

    fun onFacebookLoginClick() {
        Log.d("SignInViewModel", "Facebook Login clicked")
        // TODO: Implement Facebook Sign-In
    }

    fun onSignUpClick() {
        Log.d("SignInViewModel", "Sign Up clicked")
        // TODO: Navigate to Sign Up screen
    }
}
