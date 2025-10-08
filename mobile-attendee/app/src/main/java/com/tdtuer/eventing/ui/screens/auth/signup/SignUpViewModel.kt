package com.tdtuer.eventing.ui.screens.auth.signup

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthUserCollisionException
import com.google.firebase.auth.FirebaseAuthWeakPasswordException
import com.tdtuer.eventing.domain.usecase.authentication.GetGoogleIdTokenUseCase
import com.tdtuer.eventing.domain.usecase.authentication.SignInWithFacebookUseCase
import com.tdtuer.eventing.domain.usecase.authentication.SignInWithGoogleUseCase
import com.tdtuer.eventing.domain.usecase.authentication.SignUpUseCase
import com.tdtuer.eventing.ui.screens.auth.AuthState
import com.tdtuer.eventing.ui.screens.auth.BaseAuthViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SignUpViewModel @Inject constructor(
    private val signUpUseCase: SignUpUseCase,
    // Các UseCase này sẽ được truyền lên cho lớp cha
    signInWithGoogleUseCase: SignInWithGoogleUseCase,
    signInWithFacebookUseCase: SignInWithFacebookUseCase,
    getGoogleIdTokenUseCase: GetGoogleIdTokenUseCase
) : BaseAuthViewModel(signInWithGoogleUseCase, signInWithFacebookUseCase, getGoogleIdTokenUseCase) {

    // Trạng thái cho các trường nhập liệu (đặc thù cho SignUp)
    var fullName by mutableStateOf("")
        private set
    var email by mutableStateOf("")
        private set
    var password by mutableStateOf("")
        private set
    var confirmPassword by mutableStateOf("")
        private set

    var passwordVisibility by mutableStateOf(false)
        private set
    var confirmPasswordVisibility by mutableStateOf(false)
        private set

    // --- Xử lý sự kiện thay đổi giá trị ---
    fun onFullNameChange(value: String) {
        fullName = value
    }

    fun onEmailChange(value: String) {
        email = value
    }

    fun onPasswordChange(value: String) {
        password = value
    }

    fun onConfirmPasswordChange(value: String) {
        confirmPassword = value
    }

    fun onPasswordVisibilityToggle() {
        passwordVisibility = !passwordVisibility
    }

    fun onConfirmPasswordVisibilityToggle() {
        confirmPasswordVisibility = !confirmPasswordVisibility
    }

    // --- Xử lý sự kiện click (đặc thù cho SignUp) ---
    fun onSignUpClick() {
        if (password != confirmPassword) {
            _authState.value = AuthState.Error("Passwords do not match.")
            return
        }

        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val processedEmail = if (email.contains("@")) email else "$email@gmail.com"
            val result = signUpUseCase(fullName, processedEmail, password, "attendee")
            if (result.isSuccess) {
                _authState.value = AuthState.Success(result.getOrNull()!!)
            } else {
                val exception = result.exceptionOrNull()
                val errorMessage = when (exception) {
                    is FirebaseAuthWeakPasswordException -> "The password is too weak. Please choose a stronger one."
                    is FirebaseAuthInvalidCredentialsException -> "The email address is badly formatted."
                    is FirebaseAuthUserCollisionException -> "This email is already in use by another account."
                    else -> exception?.message ?: "An unknown error occurred."
                }
                _authState.value = AuthState.Error(errorMessage)
            }
        }
    }
}
