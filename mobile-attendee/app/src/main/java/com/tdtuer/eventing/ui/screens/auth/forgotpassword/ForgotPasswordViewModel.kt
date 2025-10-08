package com.tdtuer.eventing.ui.screens.auth.forgotpassword

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.usecase.authentication.SendPasswordResetEmailUseCase
import com.tdtuer.eventing.helpers.AppUtils
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(
    private val sendPasswordResetEmailUseCase: SendPasswordResetEmailUseCase
) : ViewModel() {

    var email by mutableStateOf("")
        private set

    var isLoading by mutableStateOf(false)
        private set

    var error by mutableStateOf<String?>(null)
        private set

    var isSuccess by mutableStateOf(false)
        private set

    fun onEmailChange(newEmail: String) {
        email = newEmail
    }

    fun onSendClick() {
        viewModelScope.launch {
            isLoading = true
            error = null
            val processedEmail = if (email.contains("@")) email else "$email@gmail.com"
            sendPasswordResetEmailUseCase(processedEmail)
                .onSuccess {
                    isLoading = false
                    isSuccess = true
                }
                .onFailure {
                    isLoading = false
                    error = it.message ?: "An unknown error occurred."
                }
        }
    }
}
