package com.tdtuer.eventing_organizer.ui.screens.splash

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.usecase.authentication.CheckOnboardingStatusUseCase
import com.tdtuer.eventing_organizer.domain.usecase.authentication.GetCurrentUserUseCase
import com.tdtuer.eventing_organizer.domain.usecase.authentication.GetRememberMeStatusUseCase
import com.tdtuer.eventing_organizer.domain.usecase.user.GetUserProfileUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filter // <-- Quan trọng
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

// Enum để định nghĩa các điểm đến có thể có từ Splash Screen
sealed class SplashNavDestination {
    data object Loading : SplashNavDestination()
    data object GoToOnboarding : SplashNavDestination()
    data object GoToAuth : SplashNavDestination()
    data object GoToHome : SplashNavDestination()
    data object GoToAdmin : SplashNavDestination()
}

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val getCurrentUserUseCase: GetCurrentUserUseCase,
    private val checkOnboardingStatusUseCase: CheckOnboardingStatusUseCase,
    private val getRememberMeStatusUseCase: GetRememberMeStatusUseCase,
    private val getUserProfileUseCase: GetUserProfileUseCase
) : ViewModel() {

    private val _destination = MutableStateFlow<SplashNavDestination>(SplashNavDestination.Loading)
    val destination = _destination.asStateFlow()

    init {
        decideNextScreen()
    }

    private fun decideNextScreen() {
        viewModelScope.launch {
            delay(1500)

            val hasCompletedOnboarding = checkOnboardingStatusUseCase().first()

            if (hasCompletedOnboarding) {
                val rememberMe = getRememberMeStatusUseCase().first()
                if (rememberMe) {
                    // 1. Kiểm tra User hiện tại
                    val currentUser = getCurrentUserUseCase().first()

                    if (currentUser != null) {
                        // 2. Gọi API Users/Me để lấy quyền Admin
                        try {
                            //Log.d("SplashViewModel", "Calling /users/me to check admin role...")

                            // ▼▼▼ SỬA LỖI TẠI ĐÂY ▼▼▼
                            // Thêm .filter { it !is Result.Loading } để bỏ qua trạng thái Loading ban đầu
                            val result = getUserProfileUseCase()
                                .filter { it !is Result.Loading }
                                .first()

                            if (result is Result.Success) {
                                val user = result.data
                                //Log.d("SplashViewModel", "Check success. IsAdmin: ${user.isAdmin}")

                                if (user.isAdmin) {
                                    _destination.value = SplashNavDestination.GoToAdmin
                                } else {
                                    _destination.value = SplashNavDestination.GoToHome
                                }
                            } else if (result is Result.Failure) {
                                // Xử lý an toàn khi ép kiểu
                                Log.e("SplashViewModel", "API Error: ${result.exception.message}")
                                _destination.value = SplashNavDestination.GoToHome
                            }
                        } catch (e: Exception) {
                            Log.e("SplashViewModel", "Exception fetching profile: ${e.message}")
                            // Fallback về Home nếu lỗi mạng/server để user vẫn dùng được app (với quyền Organizer/User)
                            _destination.value = SplashNavDestination.GoToHome
                        }
                    } else {
                        _destination.value = SplashNavDestination.GoToAuth
                    }
                } else {
                    _destination.value = SplashNavDestination.GoToAuth
                }
            } else {
                _destination.value = SplashNavDestination.GoToOnboarding
            }
        }
    }
}