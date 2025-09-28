package com.tdtuer.eventing.ui.screens.auth.resetpassword

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel

class ResetPasswordViewModel : ViewModel() {
    var email by mutableStateOf("")
        private set // Make the setter private so only ViewModel can update it internally

    fun onEmailChange(newEmail: String) {
        email = newEmail
    }

    fun onSendClick() {
        // TODO: Implement actual password reset logic here
        // For now, let's just print the email to logcat or console for demonstration
        println("Attempting to send password reset link to: $email")
        // Example: viewModelScope.launch { callResetPasswordApi(email) }
    }
}
