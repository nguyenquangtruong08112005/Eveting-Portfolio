package com.tdtuer.eventing.ui.screens.auth

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.facebook.AccessToken
import com.tdtuer.eventing.domain.usecase.authentication.GetGoogleIdTokenUseCase
import com.tdtuer.eventing.domain.usecase.authentication.SignInWithFacebookUseCase
import com.tdtuer.eventing.domain.usecase.authentication.SignInWithGoogleUseCase
import com.tdtuer.eventing.helpers.toUserMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * ViewModel cơ sở chứa logic xác thực chung (Google, Facebook, AuthState)
 * để các ViewModel con (SignIn, SignUp) có thể kế thừa và tái sử dụng.
 */
abstract class BaseAuthViewModel(
    private val signInWithGoogleUseCase: SignInWithGoogleUseCase,
    private val signInWithFacebookUseCase: SignInWithFacebookUseCase,
    private val getGoogleIdTokenUseCase: GetGoogleIdTokenUseCase
) : ViewModel() {

    // `protected` để các lớp con có thể truy cập và thay đổi giá trị
    protected val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState

    /**
     * Một phương thức hook có thể được ghi đè bởi các lớp con để thực hiện các hành động
     * sau khi đăng nhập mạng xã hội thành công.
     */
    protected open suspend fun onSocialLoginSuccess() { /* Mặc định không làm gì */ }

    /**
     * Xử lý logic đăng nhập bằng Google.
     */
    fun onGoogleLoginClick(context: Context) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            // Client ID này nên được lưu trữ ở một nơi an toàn hơn, ví dụ: build.gradle
            getGoogleIdTokenUseCase(context, "265550348267-a28baingtr8kdclrf4g0bivdrg3gaee5.apps.googleusercontent.com").onSuccess { idToken ->
                val signInResult = signInWithGoogleUseCase(idToken)
                if (signInResult.isSuccess) {
                    onSocialLoginSuccess() // Gọi hook sau khi thành công
                    _authState.value = AuthState.Success(signInResult.getOrNull()!!)
                } else {
                    _authState.value = AuthState.Error(signInResult.exceptionOrNull().toUserMessage())
                }
            }.onFailure { exception ->
                _authState.value = AuthState.Error(exception.toUserMessage())
            }
        }
    }

    /**
     * Xử lý logic đăng nhập bằng Facebook.
     */
    fun onFacebookLoginClick(token: AccessToken) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            signInWithFacebookUseCase(token).onSuccess {
                onSocialLoginSuccess() // Gọi hook sau khi thành công
                _authState.value = AuthState.Success(it)
            }.onFailure {
                _authState.value = AuthState.Error(it.toUserMessage())
            }
        }
    }
}
