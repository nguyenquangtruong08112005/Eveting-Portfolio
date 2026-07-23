package com.tdtuer.eventing.ui.screens.auth.resetpassword

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.usecase.authentication.ConfirmPasswordResetUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ResetPasswordViewModel @Inject constructor(
    private val confirmPasswordResetUseCase: ConfirmPasswordResetUseCase,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val oobCode: String = savedStateHandle.get<String>("oobCode") ?: ""

    var newPassword by mutableStateOf("")
        private set
    var confirmPassword by mutableStateOf("")
        private set
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var isSuccess by mutableStateOf(false)
        private set

    fun onNewPasswordChange(pass: String) { newPassword = pass }
    fun onConfirmPasswordChange(pass: String) { confirmPassword = pass }

    fun performPasswordReset() {
        if (newPassword.length < 6) {
            error = "Password must be at least 6 characters."
            return
        }
        if (newPassword != confirmPassword) {
            error = "Passwords do not match."
            return
        }

        viewModelScope.launch {
            isLoading = true
            error = null
            confirmPasswordResetUseCase(oobCode, newPassword)
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
