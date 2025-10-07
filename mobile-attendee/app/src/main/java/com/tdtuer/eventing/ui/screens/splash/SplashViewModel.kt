package com.tdtuer.eventing.ui.screens.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.usecase.authentication.CheckOnboardingStatusUseCase
import com.tdtuer.eventing.domain.usecase.authentication.GetCurrentUserUseCase
import com.tdtuer.eventing.domain.usecase.authentication.GetRememberMeStatusUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

// Enum để định nghĩa các điểm đến có thể có từ Splash Screen
sealed class SplashNavDestination {
    data object Loading : SplashNavDestination()
    data object GoToOnboarding : SplashNavDestination()
    data object GoToAuth : SplashNavDestination()
    data object GoToHome : SplashNavDestination()
}

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val getCurrentUserUseCase: GetCurrentUserUseCase,
    private val checkOnboardingStatusUseCase: CheckOnboardingStatusUseCase,
    private val getRememberMeStatusUseCase: GetRememberMeStatusUseCase
) : ViewModel() {

    // _destination là StateFlow riêng tư, chỉ ViewModel có thể thay đổi
    private val _destination = MutableStateFlow<SplashNavDestination>(SplashNavDestination.Loading)
    // destination là StateFlow công khai, UI sẽ lắng nghe sự thay đổi của nó
    val destination = _destination.asStateFlow()

    init {
        // Khối init sẽ được gọi ngay khi ViewModel được tạo
        // Đây là nơi hoàn hảo để bắt đầu logic kiểm tra
        decideNextScreen()
    }

    private fun decideNextScreen() {
        viewModelScope.launch {
            // Giả lập việc tải dữ liệu trong 1.5 giây để animation kịp chạy
            delay(1500)

            // Lấy giá trị đầu tiên từ Flow để biết user đã xem onboarding chưa
            val hasCompletedOnboarding = checkOnboardingStatusUseCase().first()

            if (hasCompletedOnboarding) {
                val rememberMe = getRememberMeStatusUseCase().first()
                if (rememberMe) {
                    // Nếu đã xem onboarding, kiểm tra xem user đã đăng nhập chưa
                    val currentUser = getCurrentUserUseCase().first()
                    if (currentUser != null) {
                        // Đã đăng nhập -> Vào màn hình chính
                        _destination.value = SplashNavDestination.GoToHome
                    } else {
                        // Chưa đăng nhập -> Vào màn hình đăng nhập/đăng ký
                        _destination.value = SplashNavDestination.GoToAuth
                    }
                } else {
                    _destination.value = SplashNavDestination.GoToAuth
                }
            } else {
                // Nếu chưa bao giờ xem onboarding -> Vào màn hình Onboarding
                _destination.value = SplashNavDestination.GoToOnboarding
            }
        }
    }
}
