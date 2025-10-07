package com.tdtuer.eventing.ui.screens.auth.resetpassword

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class ResetPasswordViewModel @Inject constructor(
    // TODO: Inject use cases for password reset functionality
) : ViewModel() {

    var email by mutableStateOf("")
        private set

    fun onEmailChange(newEmail: String) {
        email = newEmail
    }

    fun onSendClick() {
        // TODO: Implement password reset logic using a use case
        println("Password reset request for: $email")
    }
}
