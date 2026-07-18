package com.tdtuer.eventing_organizer.ui.screens.eventmanagement

import com.tdtuer.eventing_organizer.helpers.UserFacingErrors
import com.tdtuer.eventing_organizer.helpers.toUserMessage

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.data.network.model.AttendeeDto
import com.tdtuer.eventing_organizer.data.network.model.BroadcastResponse
import com.tdtuer.eventing_organizer.data.network.model.EventStatsResponse
import com.tdtuer.eventing_organizer.data.network.model.ImportAttendeesResponse
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Event
import com.tdtuer.eventing_organizer.domain.model.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

// State mới cho các dialog
data class ManagementDialogState(
    val showBroadcastDialog: Boolean = false,
    val showImportDialog: Boolean = false,
    val showExportDialog: Boolean = false,
    val broadcastTitle: String = "",
    val broadcastMessage: String = ""
)

data class EventManagementUiState(
    val isLoading: Boolean = false,
    val event: Event? = null,
    val stats: EventStatsResponse? = null,
    val attendees: List<AttendeeDto> = emptyList(),
    val error: String? = null,
    val successMessage: String? = null, // Thêm message thành công
    val selectedTab: Int = 0 // 0: Overview, 1: Guests
)

@HiltViewModel
class EventManagementViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    @ApplicationContext private val context: Context, // Inject Context để xử lý file uri
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    val eventId: String = savedStateHandle.get<String>("eventId") ?: ""

    private val _uiState = MutableStateFlow(EventManagementUiState())
    val uiState = _uiState.asStateFlow()

    private val _dialogState = MutableStateFlow(ManagementDialogState())
    val dialogState = _dialogState.asStateFlow()

    init {
        if (eventId.isNotEmpty()) {
            loadEventData()
        } else {
            _uiState.update { it.copy(error = "Invalid Event ID") }
        }
    }

    fun loadEventData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            // 1. Load Event Detail (nếu cần, hiện tại lấy từ stats/attendees)
            // 2. Load Stats
            launch {
                eventRepository.getEventStats(eventId).collect { result ->
                    if (result is Result.Success) _uiState.update { it.copy(stats = result.data) }
                }
            }

            // 3. Load Attendees
            launch {
                eventRepository.getEventAttendees(eventId).collect { result ->
                    if (result is Result.Success) {
                        _uiState.update { it.copy(attendees = result.data, isLoading = false) }
                    } else if (result is Result.Failure) {
                        _uiState.update { it.copy(isLoading = false) } // Stop loading anyway
                    }
                }
            }
        }
    }

    fun onTabSelected(index: Int) {
        _uiState.update { it.copy(selectedTab = index) }
    }

    // --- BROADCAST LOGIC ---
    fun showBroadcast() { _dialogState.update { it.copy(showBroadcastDialog = true) } }
    fun hideBroadcast() { _dialogState.update { it.copy(showBroadcastDialog = false) } }
    fun onBroadcastTitleChange(v: String) { _dialogState.update { it.copy(broadcastTitle = v) } }
    fun onBroadcastMessageChange(v: String) { _dialogState.update { it.copy(broadcastMessage = v) } }

    fun sendBroadcast() {
        val title = _dialogState.value.broadcastTitle
        val message = _dialogState.value.broadcastMessage
        if (title.isBlank() || message.isBlank()) return

        viewModelScope.launch {
            hideBroadcast()
            _uiState.update { it.copy(isLoading = true) }
            val result = eventRepository.broadcastNotification(eventId, title, message)
            if (result is Result.Success) {
                val sentTo = result.data.sentTo
                val successMsg = if (sentTo != null) {
                    "Đã gửi thông báo thành công đến $sentTo người!"
                } else {
                    "Đã gửi thông báo thành công!"
                }
                _uiState.update { it.copy(isLoading = false, successMessage = successMsg) }
            } else {
                val err = UserFacingErrors.toUserMessage((result as Result.Failure).exception)
                _uiState.update { it.copy(isLoading = false, error = err) }
            }
        }
    }

    // --- IMPORT LOGIC ---
    fun onFileSelectedForImport(uri: Uri?) {
        if (uri == null) return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // Chuyển Uri thành File tạm
            val file = uriToFile(uri)
            if (file != null) {
                val result = eventRepository.importAttendees(eventId, file)
                if (result is Result.Success) {
                    val response = result.data
                    val successCount = response.successCount
                    val failCount = response.failCount
                    val errors = response.errors
                    val successMsg = if (successCount != null && failCount != null) {
                        var msg = "Import thành công: $successCount. Thất bại: $failCount."
                        val firstError = errors?.firstOrNull()
                        if (firstError != null) {
                            val rowObj = firstError.row
                            val hint = when (rowObj) {
                                is Map<*, *> -> {
                                    val email = rowObj.entries.find { it.key.toString().contains("email", ignoreCase = true) }?.value?.toString()
                                    val name = rowObj.entries.find { it.key.toString().contains("name", ignoreCase = true) }?.value?.toString()
                                    val rowNum = rowObj.entries.find {
                                        val k = it.key.toString()
                                        k.equals("row", ignoreCase = true) || k.equals("index", ignoreCase = true) || k.equals("line", ignoreCase = true)
                                    }?.value?.toString()
                                    email ?: name ?: rowNum ?: ""
                                }
                                is List<*> -> {
                                    val email = rowObj.find { it?.toString()?.contains("@") == true }?.toString()
                                    email ?: rowObj.firstOrNull()?.toString() ?: ""
                                }
                                is String -> rowObj
                                is Number -> rowObj.toString()
                                else -> ""
                            }
                            val hintStr = if (hint.isNotBlank()) " ($hint)" else ""
                            msg += " Lỗi$hintStr: ${firstError.error ?: "Không xác định"}"
                        }
                        msg
                    } else {
                        "Import thành công! Đang tải lại danh sách."
                    }
                    _uiState.update { it.copy(isLoading = false, successMessage = successMsg) }
                    loadEventData()
                } else {
                    val err = UserFacingErrors.toUserMessage((result as Result.Failure).exception)
                    _uiState.update { it.copy(isLoading = false, error = err) }
                }
            } else {
                _uiState.update { it.copy(isLoading = false, error = "Không thể đọc file") }
            }
        }
    }

    // --- EXPORT LOGIC ---
    fun showExport() { _dialogState.update { it.copy(showExportDialog = true) } }
    fun hideExport() { _dialogState.update { it.copy(showExportDialog = false) } }

    fun exportAttendees() {
        viewModelScope.launch {
            hideExport()
            _uiState.update { it.copy(isLoading = true) }
            val result = eventRepository.exportAttendees(eventId)
            if (result is Result.Success) {
                _uiState.update {
                    it.copy(isLoading = false, successMessage = "File đã được lưu tại: ${result.data}")
                }
            } else {
                _uiState.update {
                    it.copy(isLoading = false, error = "Xuất file thất bại: ${UserFacingErrors.toUserMessage((result as Result.Failure).exception)}")
                }
            }
        }
    }

    // Helper: Convert Uri -> File
    private fun uriToFile(uri: Uri): File? {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri) ?: return null
            // Tạo file tạm trong cache directory
            val tempFile = File.createTempFile("import_temp", ".xlsx", context.cacheDir)
            val outputStream = FileOutputStream(tempFile)
            inputStream.copyTo(outputStream)
            inputStream.close()
            outputStream.close()
            tempFile
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun clearMessage() {
        _uiState.update { it.copy(successMessage = null, error = null) }
    }

    fun onBackClick() {
        // Handled in UI
    }
}