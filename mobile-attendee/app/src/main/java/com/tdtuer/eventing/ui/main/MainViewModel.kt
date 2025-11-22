package com.tdtuer.eventing.ui.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.data.network.model.UpdateUserRequest
import com.tdtuer.eventing.domain.usecase.settings.GetThemeUseCase
import com.tdtuer.eventing.domain.usecase.user.UpdateUserProfileUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    getThemeUseCase: GetThemeUseCase,
    private val updateUserProfileUseCase: UpdateUserProfileUseCase // Inject thêm
) : ViewModel() {

    val isDarkMode: StateFlow<Boolean?> = getThemeUseCase()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    fun updateFcmToken(token: String) {
        viewModelScope.launch {
            try {
                updateUserProfileUseCase(UpdateUserRequest(fcmToken = token))
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}