package com.tdtuer.eventing.ui.screens.ticket

import androidx.annotation.DrawableRes
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

// --- Data Model ---
data class TicketDetails(
    val title: String,
    val date: String,
    val time: String,
    val venue: String,
    val seat: String,
    @DrawableRes val eventImageRes: Int,
    @DrawableRes val barcodeImageRes: Int
)

data class TicketUiState(
    val ticketDetails: TicketDetails
)

class TicketViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(createDummyState())
    val uiState = _uiState.asStateFlow()

    private fun loadTicketDetails() {
        _uiState.value = createDummyState()
    }

    private fun createDummyState(): TicketUiState {
        // In a real app, this data would be fetched from a repository/API
        val ticketDetails = TicketDetails(
            title = "International Band Music Concert 2022",
            date = "October 25, 2022",
            time = "10:00 PM",
            venue = "October 25, 2022", // Venue data seems same as date in design
            seat = "05",
            eventImageRes = R.drawable.group_34057, // Replace with your image
            barcodeImageRes = R.drawable.group_34057 // Replace with your barcode image
        )
        return TicketUiState(ticketDetails = ticketDetails)
    }

    // --- Event Handlers ---
    fun onBackClick() { println("Back clicked") }
    fun onCartClick() { println("Cart clicked") }
    fun onMoreOptionsClick() { println("More options clicked") }
    fun onDownloadClick() { println("Download clicked") }
}