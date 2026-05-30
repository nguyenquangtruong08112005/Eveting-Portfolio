package com.tdtuer.eventing_organizer.ui.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.messaging.FirebaseMessaging
import com.onesignal.OneSignal
import com.tdtuer.eventing_organizer.data.network.model.UpdateUserRequest
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.usecase.authentication.GetCurrentUserUseCase
import com.tdtuer.eventing_organizer.domain.usecase.settings.GetThemeUseCase
import com.tdtuer.eventing_organizer.domain.usecase.user.UpdateUserProfileUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    getThemeUseCase: GetThemeUseCase,
    private val getCurrentUserUseCase: GetCurrentUserUseCase,
    private val updateUserProfileUseCase: UpdateUserProfileUseCase
) : ViewModel() {

    val isDarkMode: StateFlow<Boolean?> = getThemeUseCase()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    fun updateFcmToken(token: String) {
        viewModelScope.launch {
            try {
                updateUserProfileUseCase(UpdateUserRequest(fcmToken = token)).collect { result ->
                    when (result) {
                        is Result.Success -> {}
                        is Result.Failure -> {}
                        is Result.Loading -> {}
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun registerPushAtStartup() {
        viewModelScope.launch {
            try {
                val user = getCurrentUserUseCase().firstOrNull()
                if (user != null && user.id.isNotBlank()) {
                    try {
                        OneSignal.login(user.id)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                val token = FirebaseMessaging.getInstance().token.await()
                updateUserProfileUseCase(UpdateUserRequest(fcmToken = token)).collect { result ->
                    when (result) {
                        is Result.Success -> {}
                        is Result.Failure -> {}
                        is Result.Loading -> {}
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}