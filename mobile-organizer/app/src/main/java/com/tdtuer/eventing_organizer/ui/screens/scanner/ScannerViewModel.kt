package com.tdtuer.eventing_organizer.ui.screens.scanner

import com.tdtuer.eventing_organizer.helpers.UserFacingErrors
import com.tdtuer.eventing_organizer.helpers.toUserMessage

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.data.network.model.CheckInTicketInfo
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class ScanStatus {
    IDLE, SUCCESS, WARNING, ERROR
}

data class ScannerUiState(
    val isLoading: Boolean = false,
    val scanStatus: ScanStatus = ScanStatus.IDLE,
    val ticketInfo: CheckInTicketInfo? = null,
    val message: String = "",
    val showResultDialog: Boolean = false
)

@HiltViewModel
class ScannerViewModel @Inject constructor(
    private val eventRepository: EventRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ScannerUiState())
    val uiState = _uiState.asStateFlow()

    private var isProcessing = false

    fun onQrCodeScanned(code: String) {
        if (isProcessing || _uiState.value.showResultDialog) return
        isProcessing = true

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val result = eventRepository.checkInTicket(code)
            Log.d("", "Result: $result")

            _uiState.update { state ->
                when (result) {
                    is Result.Success -> {
                        val response = result.data
                        if (response.valid) {
                            // --- CHECK-IN THÀNH CÔNG ---
                            state.copy(
                                isLoading = false,
                                scanStatus = ScanStatus.SUCCESS,
                                ticketInfo = response.ticketInfo,
                                message = "Hợp lệ", // Thông báo ngắn gọn
                                showResultDialog = true
                            )
                        } else {
                            // --- LỖI LOGIC TỪ SERVER ---
                            val rawMsg = response.message

                            // 1. Phân loại lỗi
                            val isAlreadyCheckedIn = rawMsg.contains("already been checked in", ignoreCase = true)

                            // 2. "Dịch" thông báo sang tiếng Việt thân thiện
                            val friendlyMessage = when {
                                isAlreadyCheckedIn -> "Vé này đã được sử dụng trước đó!"
                                rawMsg.contains("Ticket not found", ignoreCase = true) -> "Vé không tồn tại trong hệ thống."
                                rawMsg.contains("Event not found", ignoreCase = true) -> "Sự kiện không hợp lệ."
                                rawMsg.contains("Forbidden", ignoreCase = true) -> "Bạn không có quyền soát vé sự kiện này."
                                rawMsg.contains("Cannot check-in", ignoreCase = true) -> "Vé chưa thanh toán hoặc bị hủy."
                                rawMsg.contains("This ticket has been checked in", ignoreCase = true) -> "Vé đã đạt số lượng check in tối đa."

                                else -> "Lỗi: $rawMsg" // Fallback cho lỗi lạ
                            }

                            state.copy(
                                isLoading = false,
                                scanStatus = if (isAlreadyCheckedIn) ScanStatus.WARNING else ScanStatus.ERROR,
                                ticketInfo = response.ticketInfo, // Vẫn hiện thông tin vé (nếu có) để đối chiếu
                                message = friendlyMessage,
                                showResultDialog = true
                            )
                        }
                    }
                    is Result.Failure -> {
                        val ex = result.exception
                        val errorMsg = UserFacingErrors.toUserMessage(ex)
                        val httpCode = (ex as? com.tdtuer.eventing_organizer.helpers.UserFacingException)?.httpCode

                        val isAlreadyCheckedIn = errorMsg.contains("already been checked in", ignoreCase = true) ||
                            errorMsg.contains("checked in", ignoreCase = true) ||
                            httpCode == 409

                        val friendlyMessage = when {
                            isAlreadyCheckedIn -> "Vé này đã được sử dụng trước đó!"
                            httpCode == 403 -> "Không có quyền truy cập."
                            httpCode == 404 -> "Không tìm thấy dữ liệu."
                            errorMsg.contains("internet", ignoreCase = true) ||
                                errorMsg.contains("Network", ignoreCase = true) ->
                                "Vui lòng kiểm tra kết nối mạng."
                            else -> errorMsg.ifBlank { "Có lỗi xảy ra. Vui lòng thử lại." }
                        }

                        state.copy(
                            isLoading = false,
                            scanStatus = if (isAlreadyCheckedIn) ScanStatus.WARNING else ScanStatus.ERROR,
                            ticketInfo = null,
                            message = friendlyMessage,
                            showResultDialog = true
                        )
                    }
                    else -> state.copy(isLoading = false)
                }
            }
        }
    }

    fun dismissDialog() {
        _uiState.update {
            it.copy(showResultDialog = false, scanStatus = ScanStatus.IDLE, ticketInfo = null, message = "")
        }
        viewModelScope.launch {
            delay(1500) // Delay lâu hơn chút để người dùng kịp đưa vé ra xa
            isProcessing = false
        }
    }
}