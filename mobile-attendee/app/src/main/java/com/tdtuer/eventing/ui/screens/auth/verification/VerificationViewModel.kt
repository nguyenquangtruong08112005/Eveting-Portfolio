package com.tdtuer.eventing.ui.screens.auth.verification

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class VerificationViewModel : ViewModel() {
    var otpValue by mutableStateOf("")
        private set

    var timerSeconds by mutableStateOf(20) // Initial timer value
        private set

    val isTimerRunning: Boolean
        get() = timerSeconds > 0

    private var timerJob: Job? = null

    init {
        startTimer()
    }

    fun onNumberClick(number: String) {
        if (otpValue.length < 4) {
            otpValue += number
        }
    }

    fun onBackspaceClick() {
        if (otpValue.isNotEmpty()) {
            otpValue = otpValue.dropLast(1)
        }
    }

    fun onContinueClick() {
        // TODO: Implement OTP verification logic
        println("Continue clicked with OTP: $otpValue")
        // Example: viewModelScope.launch { verifyOtp(otpValue) }
    }

    fun onResendCodeClick() {
        if (!isTimerRunning) {
            // TODO: Implement logic to resend code
            println("Resend code clicked")
            otpValue = "" // Optionally clear OTP
            timerSeconds = 20 // Reset timer
            startTimer()
        }
    }
    
    fun onBackNavigationClick() {
        // TODO: Implement back navigation logic
        println("Back navigation Clicked")
    }

    private fun startTimer() {
        timerJob?.cancel() // Cancel any existing timer
        timerJob = viewModelScope.launch {
            while (timerSeconds > 0) {
                delay(1000)
                timerSeconds--
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel() // Ensure timer is cancelled when ViewModel is cleared
    }
}
