package com.tdtuer.eventing.ui.screens.auth.signup

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel

class SignUpViewModel : ViewModel() {
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
        // TODO: Implement actual sign-up logic (validation, API call, etc.)
        println("Sign Up Clicked: Name=$fullName, Email=$email, Pass=$password, ConfirmPass=$confirmPassword")
        // Example: Check if password == confirmPassword, then proceed
    }

    fun onGoogleLoginClick() {
        // TODO: Implement Google login logic
        println("Google Login Clicked")
    }

    fun onFacebookLoginClick() {
        // TODO: Implement Facebook login logic
        println("Facebook Login Clicked")
    }

    fun onSignInLinkClick() {
        // TODO: Implement navigation to Sign In screen
        println("Navigate to Sign In screen")
    }

    fun onBackNavigationClick() {
        // TODO: Implement back navigation logic
        println("Back navigation Clicked")
    }
}
