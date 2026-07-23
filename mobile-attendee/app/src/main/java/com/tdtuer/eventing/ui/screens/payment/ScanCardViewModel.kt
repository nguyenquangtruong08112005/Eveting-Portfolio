package com.tdtuer.eventing.ui.screens.scancard

import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.screens.paymentconfirmation.CardDetails // Reusing the data class
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

data class ScanCardUiState(
    val isScanning: Boolean = false,
    val detectedCard: CardDetails? = null
)

class ScanCardViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(ScanCardUiState())
    val uiState = _uiState.asStateFlow()

    init {
        startScan()
    }

    private fun startScan() {
        // In a real app, this would initialize the camera and ML model.
        // For this demo, we'll just show a sample "detected" card.
        val sampleCard = CardDetails(
            providerLogoRes = R.drawable.google,
            brandName = "VISA",
            lastFourDigits = "3090",
            maskedNumber = "**** **** **** 3090",
            cardholderName = "Peter Crouch",
            expiryDate = "09/24"
        )

        _uiState.value = ScanCardUiState(
            isScanning = true,
            detectedCard = sampleCard
        )
    }

    fun onBackClick() {
        println("Back clicked, stopping scan.")
        // Here you would release camera resources.
    }
}