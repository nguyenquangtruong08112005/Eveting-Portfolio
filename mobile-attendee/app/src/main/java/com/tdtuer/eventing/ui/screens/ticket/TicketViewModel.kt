package com.tdtuer.eventing.ui.screens.ticket

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.model.DetailedTicket
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.tickets.GetTicketDetailsUseCase
import com.tdtuer.eventing.domain.usecase.tickets.SaveTicketUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlinx.coroutines.channels.Channel // <-- (1) THÊM IMPORT
import kotlinx.coroutines.flow.receiveAsFlow // <-- (2) THÊM IMPORT

// --- (3) ĐỊNH NGHĨA UI STATE MỚI ---
sealed class TicketUiState {
    object Loading : TicketUiState()
    data class Success(val ticket: DetailedTicket, val toastMessage: String? = null) : TicketUiState()
    data class Error(val message: String, val toastMessage: String? = null) : TicketUiState()
}

// (4) THÊM DATA CLASS CHO EVENT LƯU FILE
data class SaveRequest(
    val qrCodeData: String, // Dữ liệu để tạo 2 mã
    val eventName: String,
    val ticketId: String
)

@HiltViewModel
class TicketViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val saveTicketUseCase: SaveTicketUseCase,
    private val getTicketDetailsUseCase: GetTicketDetailsUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow<TicketUiState>(TicketUiState.Loading)
    val uiState: StateFlow<TicketUiState> = _uiState.asStateFlow()

    // --- (5) TẠO CHANNEL ĐỂ GỬI EVENT SANG UI ---
    private val _saveEvent = Channel<SaveRequest>()
    val saveEvent = _saveEvent.receiveAsFlow()
    // ---------------------------------------------

    init {
        val ticketId: String? = savedStateHandle.get("ticketId")

        if (ticketId.isNullOrEmpty()) {
            _uiState.value = TicketUiState.Error("Không tìm thấy mã vé.")
        } else {
            loadTicketDetails(ticketId)
        }
    }

    private fun loadTicketDetails(ticketId: String) {
        viewModelScope.launch {
            _uiState.value = TicketUiState.Loading
            when (val result = getTicketDetailsUseCase(ticketId)) {
                is Result.Success -> {
                    _uiState.value = TicketUiState.Success(result.data)
                }

                is Result.Failure -> {
                    _uiState.value = TicketUiState.Error(result.exception.message ?: "Lỗi tải vé")
                }

                is Result.Loading -> {}
            }
        }
    }

    // --- Event Handlers (giữ nguyên) ---
    fun onBackClick() {}
    fun onCartClick() {
        println("Cart clicked")
    }

    fun onMoreOptionsClick() {
        println("More options clicked")
    }

    // --- (6) CẬP NHẬT onDownloadClick ---
    fun onDownloadClick() {
        val currentState = _uiState.value
        if (currentState is TicketUiState.Success) {
            viewModelScope.launch {
                val request = SaveRequest(
                    qrCodeData = currentState.ticket.qrCode,
                    eventName = currentState.ticket.eventName,
                    ticketId = currentState.ticket.id
                )
                val result = saveTicketUseCase(request)

                if (result.isSuccess) {
                    // Cập nhật đúng cách
                    _uiState.update {
                        (it as TicketUiState.Success).copy(toastMessage = "Đã lưu 2 ảnh thành công")
                    }
                } else {
                    _uiState.update {
                        (it as TicketUiState.Success).copy(toastMessage = "Lỗi khi lưu ảnh: ${result.exceptionOrNull()?.message}")
                    }
                }
            }
        }
    }

    // (3) THÊM HÀM NÀY: Để reset Toast sau khi hiển thị
    fun onToastShown() {
        val currentState = _uiState.value
        if (currentState is TicketUiState.Success && currentState.toastMessage != null) {
            _uiState.update { (it as TicketUiState.Success).copy(toastMessage = null) }
        } else if (currentState is TicketUiState.Error && currentState.toastMessage != null) {
            _uiState.update { (it as TicketUiState.Error).copy(toastMessage = null) }
        }
    }
}