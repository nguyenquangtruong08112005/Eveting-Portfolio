package com.tdtuer.eventing.ui.screens.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch

class SplashViewModel : ViewModel() {

    private val _navigateToNextScreen = MutableSharedFlow<Unit>(replay = 0)
    val navigateToNextScreen = _navigateToNextScreen.asSharedFlow()

    // You can adjust the delay as needed
    private val splashDelayMillis = 2000L // 2 seconds

    init {
        // Example: Start a timer to navigate after a delay
        // In a real app, you might do initial data loading or checks here
        // before navigating.
        viewModelScope.launch {
            delay(splashDelayMillis)
            _navigateToNextScreen.emit(Unit)
        }
    }

    // Any other splash screen specific logic can go here.
    // For instance, checking if the user is logged in, an update is required, etc.
}
