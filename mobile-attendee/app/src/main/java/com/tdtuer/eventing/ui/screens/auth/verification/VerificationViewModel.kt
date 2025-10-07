package com.tdtuer.eventing.ui.screens.auth.verification

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.usecase.authentication.CheckEmailVerificationStatusUseCase
import com.tdtuer.eventing.domain.usecase.authentication.SendEmailVerificationUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject


data class VerificationUiState(
    val isLoading: Boolean = false,
    val isEmailSent: Boolean = false,
    val isVerified: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class VerificationViewModel @Inject constructor(
    private val sendVerificationEmailUseCase: SendEmailVerificationUseCase,
    private val checkVerificationStatusUseCase: CheckEmailVerificationStatusUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(VerificationUiState())
    val uiState: StateFlow<VerificationUiState> = _uiState.asStateFlow()

    // Gọi hàm này ngay sau khi đăng ký thành công hoặc khi người dùng yêu cầu gửi lại
    fun sendVerificationEmail() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = sendVerificationEmailUseCase()
            if (result.isSuccess) {
                _uiState.value = _uiState.value.copy(isLoading = false, isEmailSent = true)
            } else {
                _uiState.value = _uiState.value.copy(isLoading = false, error = result.exceptionOrNull()?.message)
            }
        }
    }

    fun checkVerificationStatus() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = checkVerificationStatusUseCase()
            if (result.isSuccess) {
                _uiState.value = _uiState.value.copy(isLoading = false, isVerified = result.getOrNull() ?: false)
            } else {
                _uiState.value = _uiState.value.copy(isLoading = false, error = result.exceptionOrNull()?.message)
            }
        }
    }
}
