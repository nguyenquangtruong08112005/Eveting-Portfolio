package com.tdtuer.eventing.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SignOutUseCase
import com.tdtuer.eventing_organizer.domain.usecase.settings.GetThemeUseCase
import com.tdtuer.eventing_organizer.domain.usecase.settings.SaveThemeUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val isDarkTheme: Boolean = false, // Trạng thái hiển thị của Switch
    val areNotificationsEnabled: Boolean = true,
    val language: String = "English",
    val version: String = "1.0.0"
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val signOutUseCase: SignOutUseCase,
    private val getThemeUseCase: GetThemeUseCase,
    private val saveThemeUseCase: SaveThemeUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState = _uiState.asStateFlow()

    init {
        // Lắng nghe thay đổi theme từ DataStore
        viewModelScope.launch {
            getThemeUseCase().collectLatest { isDark ->
                // Nếu chưa có setting (null), mặc định có thể là false hoặc theo hệ thống
                _uiState.update { it.copy(isDarkTheme = isDark ?: false) }
            }
        }
    }

    private fun observeTheme() {
        viewModelScope.launch {
            getThemeUseCase().collectLatest { isDark ->
                // Nếu null (chưa set), tạm thời hiển thị false hoặc true tùy logic mặc định bạn muốn hiển thị lên UI
                // Ở đây ta chỉ cập nhật nếu có giá trị
                if (isDark != null) {
                    _uiState.update { it.copy(isDarkTheme = isDark) }
                }
            }
        }
    }

    // Hàm gọi từ UI khi người dùng bấm Switch
    fun onToggleTheme(isDark: Boolean) {
        viewModelScope.launch {
            saveThemeUseCase(isDark) // Lưu vào DataStore
            // UI tự cập nhật nhờ block init ở trên
        }
    }
    // --- Events ---

    fun onBackClick() {
        // Logic back sẽ được xử lý ở UI (navController.popBackStack())
    }

    fun onToggleNotifications(enabled: Boolean) {
        _uiState.update { it.copy(areNotificationsEnabled = enabled) }
    }

    fun onChangeLanguage() {
        // Demo: Toggle giữa English và Vietnamese
        _uiState.update {
            it.copy(language = if (it.language == "English") "Vietnamese" else "English")
        }
    }

    fun onLogoutClick(onLogoutSuccess: () -> Unit) {
        viewModelScope.launch {
            signOutUseCase()
            onLogoutSuccess()
        }
    }


}