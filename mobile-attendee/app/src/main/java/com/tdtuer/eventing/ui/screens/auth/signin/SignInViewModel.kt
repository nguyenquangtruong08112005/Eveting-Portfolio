package com.tdtuer.eventing.ui.screens.auth.signin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel

class SignInViewModel : ViewModel() {
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
        // TODO: Implement forgot password navigation/logic
        println("Forgot Password Clicked")
    }

    fun onGoogleLoginClick() {
        // TODO: Implement Google login logic
        println("Google Login Clicked")
    }

    fun onFacebookLoginClick() {
        // TODO: Implement Facebook login logic
        println("Facebook Login Clicked")
    }

    fun onSignUpClick() {
        // TODO: Implement sign-up navigation/logic
        println("Sign Up Clicked")
    }
}
