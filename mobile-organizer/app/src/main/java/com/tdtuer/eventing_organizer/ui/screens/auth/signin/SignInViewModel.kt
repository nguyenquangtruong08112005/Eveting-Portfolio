package com.tdtuer.eventing_organizer.ui.screens.auth.signin

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.usecase.authentication.GetGoogleIdTokenUseCase
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SaveRememberMeStatusUseCase
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SignInUseCase
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SignInWithFacebookUseCase
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SignInWithGoogleUseCase
import com.tdtuer.eventing_organizer.domain.usecase.user.GetUserProfileUseCase
import com.tdtuer.eventing_organizer.ui.screens.auth.AuthState
import com.tdtuer.eventing_organizer.ui.screens.auth.BaseAuthViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SignInViewModel @Inject constructor(
    private val signInUseCase: SignInUseCase,
    private val saveRememberMeStatusUseCase: SaveRememberMeStatusUseCase,
    signInWithGoogleUseCase: SignInWithGoogleUseCase,
    signInWithFacebookUseCase: SignInWithFacebookUseCase,
    getGoogleIdTokenUseCase: GetGoogleIdTokenUseCase,
    private val getUserProfileUseCase: GetUserProfileUseCase,
) : BaseAuthViewModel(signInWithGoogleUseCase, signInWithFacebookUseCase, getGoogleIdTokenUseCase) {

    var email by mutableStateOf("")
        private set
    var password by mutableStateOf("")
        private set
    var passwordVisibility by mutableStateOf(false)
        private set
    var rememberMe by mutableStateOf(true)
        private set

    fun onEmailChange(value: String) { email = value }
    fun onPasswordChange(value: String) { password = value }
    fun onPasswordVisibilityToggle() { passwordVisibility = !passwordVisibility }
    fun onRememberMeChange(value: Boolean) { rememberMe = value }

    override suspend fun onSocialLoginSuccess() {
        saveRememberMeStatusUseCase(rememberMe)
    }

    fun onSignInClick() {
        if (email.isBlank() || password.isBlank()) {
            _authState.value = AuthState.Error("Email and password can't be blank.")
            return
        }

        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val processedEmail = if (email.contains("@")) email else "$email@gmail.com"

//            Log.d("SignInViewModel", "1. Bắt đầu gọi signInUseCase...")

            // Bước 1: Đăng nhập Firebase
            val result = signInUseCase(processedEmail, password)

//            Log.d("SignInViewModel", "2. Kết quả signInUseCase: ${result::class.simpleName}")

            if (result.isSuccess) {
//                Log.d("SignInViewModel", "3. Đăng nhập Firebase thành công. Đang lấy Profile từ API...")

                // Bước 2: Gọi API Profile để lấy Role (Admin/Organizer)
                // QUAN TRỌNG: Dùng .filter để bỏ qua Loading, chỉ lấy Success hoặc Failure
                try {
                    val profileResult = getUserProfileUseCase()
                        .filter { it !is Result.Loading } // <-- FIX QUAN TRỌNG
                        .first()

//                    Log.d("SignInViewModel", "4. Kết quả API Profile: $profileResult")

                    if (profileResult is Result.Success) {
                        val userWithRole = profileResult.data
//                        Log.d("SignInViewModel", "5. User Role: isAdmin=${userWithRole.isAdmin}, isOrganizer=${userWithRole.isOrganizer}")

                        _authState.value = AuthState.Success(userWithRole)
                        saveRememberMeStatusUseCase(rememberMe)
                    } else {
//                        Log.e("SignInViewModel", "5. Lỗi lấy Profile: ${(profileResult as? Result.Failure)?.exception?.message}")

                        // Fallback: Nếu API lỗi, dùng tạm user từ Firebase (nhưng sẽ không có quyền Admin)
                        _authState.value = AuthState.Success(result.getOrNull()!!)
                    }
                } catch (e: Exception) {
//                    Log.e("SignInViewModel", "Exception khi gọi Profile API: ${e.message}")
                    _authState.value = AuthState.Success(result.getOrNull()!!)
                }
            } else {
                val exception = result.exceptionOrNull()
//                Log.e("SignInViewModel", "Lỗi đăng nhập: ${exception?.message}")

                val errorMessage = when (exception) {
                    is FirebaseAuthInvalidCredentialsException -> "Incorrect email or password."
                    is FirebaseAuthInvalidUserException -> "No account found."
                    is FirebaseNetworkException -> "Check your internet connection."
                    else -> exception?.localizedMessage ?: "An unknown error occurred."
                }
                _authState.value = AuthState.Error(errorMessage)
            }
        }
    }
}