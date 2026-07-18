package com.tdtuer.eventing_organizer.ui.screens.auth.verification

import com.tdtuer.eventing_organizer.helpers.UserFacingErrors
import com.tdtuer.eventing_organizer.helpers.toUserMessage

import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.domain.usecase.authentication.ApplyVerificationCodeUseCase
import com.tdtuer.eventing_organizer.domain.usecase.authentication.CheckEmailVerificationStatusUseCase
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SendEmailVerificationUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import androidx.core.net.toUri
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn


data class VerificationUiState(
    val isLoading: Boolean = false,
    val isEmailSent: Boolean = false,
    val isVerified: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class VerificationViewModel @Inject constructor(
    private val sendVerificationEmailUseCase: SendEmailVerificationUseCase,
    private val checkVerificationStatusUseCase: CheckEmailVerificationStatusUseCase,
    private val applyVerificationCodeUseCase: ApplyVerificationCodeUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(VerificationUiState())
    val uiState: StateFlow<VerificationUiState> = _uiState.asStateFlow()

    private val _resendCooldown = MutableStateFlow(0)
    val resendCooldown: StateFlow<Int> = _resendCooldown.asStateFlow()

    val isResendEnabled: StateFlow<Boolean> = _resendCooldown
        .map { it == 0 }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)


    // Modify your sendVerificationEmail() function
    fun sendVerificationEmail() {
        // Prevent sending if cooldown is active
        if (_resendCooldown.value > 0) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = sendVerificationEmailUseCase()
            if (result.isSuccess) {
                //Log.d("VerificationVM", "Email verification sent successfully.")
                _uiState.value = _uiState.value.copy(isLoading = false, isEmailSent = true)
                // Start the cooldown timer
                startResendCooldown()
            } else {
                val errorMessage = result.exceptionOrNull()?.message ?: "Unknown error"
                Log.e("VerificationVM", "Failed to send verification email: $errorMessage")
                _uiState.value = _uiState.value.copy(isLoading = false, error = errorMessage)
            }
        }
    }

    // Add this new private function to handle the timer
    private fun startResendCooldown(durationSeconds: Int = 60) {
        viewModelScope.launch {
            for (i in durationSeconds downTo 1) {
                _resendCooldown.value = i
                delay(1000)
            }
            _resendCooldown.value = 0
        }
    }

    fun handleDeepLink(link: String?) {
        if (link == null) return

        try {
            val uri = link.toUri()
            val oobCode = uri.getQueryParameter("oobCode")

            if (oobCode != null) {
                //Log.d("VerificationVM", "oobCode found, applying verification...")
                viewModelScope.launch {
                    _uiState.value = _uiState.value.copy(isLoading = true, error = null)
                    val result = applyVerificationCodeUseCase(oobCode)
                    if (result.isSuccess) {
                        //Log.d("VerificationVM", "Verification successful via deep link.")
                        _uiState.value =
                            _uiState.value.copy(isLoading = false, isVerified = true)
                    } else {
                        val errorMessage =
                            result.exceptionOrNull()?.message ?: "Invalid verification link"
                        Log.e("VerificationVM", "Deep link verification failed: $errorMessage")
                        _uiState.value =
                            _uiState.value.copy(isLoading = false, error = errorMessage)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("VerificationVM", "Failed to parse deep link: $link", e)
            _uiState.value = _uiState.value.copy(error = "Invalid link format.")
        }
    }

    fun checkVerificationStatus() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = checkVerificationStatusUseCase()
            if (result.isSuccess) {
                val isVerified = result.getOrNull() ?: false
                //Log.d("VerificationVM", "Email verification status: $isVerified")
                _uiState.value = _uiState.value.copy(isLoading = false, isVerified = isVerified)
            } else {
                val errorMessage = result.exceptionOrNull()?.message ?: "Unknown error"
                Log.e("VerificationVM", "Failed to check verification status: $errorMessage")
                _uiState.value = _uiState.value.copy(isLoading = false, error = errorMessage)
            }
        }
    }
}
