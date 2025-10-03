package com.tdtuer.eventing.ui.screens.auth.signup

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.facebook.AccessToken
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FacebookAuthProvider
import com.google.firebase.auth.FirebaseAuth
import com.tdtuer.eventing.domain.model.User
import com.tdtuer.eventing.domain.usecase.Authentication.SignInWithFacebookUseCase
import com.tdtuer.eventing.domain.usecase.Authentication.SignInWithGoogleUseCase
import com.tdtuer.eventing.domain.usecase.Authentication.SignUpUseCase
import com.tdtuer.eventing.ui.screens.auth.AuthState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.security.MessageDigest
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class SignUpViewModel @Inject constructor(
    private val signUpUseCase: SignUpUseCase,
    private val signInWithGoogleUseCase: SignInWithGoogleUseCase,
    private val signInWithFacebookUseCase: SignInWithFacebookUseCase,
    private val auth: FirebaseAuth
) : ViewModel() {

    // Trạng thái cho các trường nhập liệu
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

    // Trạng thái xác thực (public để UI có thể lắng nghe)
    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState

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

    // --- Xử lý sự kiện click ---
    fun onSignUpClick() {
        if (password != confirmPassword) {
            _authState.value = AuthState.Error("Mật khẩu không khớp.")
            return
        }

        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val result = signUpUseCase(fullName, email, password, "attendee")
            _authState.value = when {
                result.isSuccess -> AuthState.Success(result.getOrNull()!!)
                else -> AuthState.Error(result.exceptionOrNull()?.message ?: "Lỗi không xác định")
            }
        }
    }

    fun onGoogleLoginClick(context: Context) {
        viewModelScope.launch {
            try {
                _authState.value = AuthState.Loading

                val credentialManager = CredentialManager.create(context)

                val rawNonce = UUID.randomUUID().toString()
                val bytes = rawNonce.toByteArray()
                val md = MessageDigest.getInstance("SHA-256")
                val digest = md.digest(bytes)
                val hashedNonce = digest.fold("") { str, it -> str + "%02x".format(it) }

                val googleIdOption: GetGoogleIdOption = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId("265550348267-a28baingtr8kdclrf4g0bivdrg3gaee5.apps.googleusercontent.com")
                    .setNonce(hashedNonce)
                    .build()

                val request: GetCredentialRequest = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build()

                val result = credentialManager.getCredential(
                    request = request,
                    context = context,
                )
                val credential = result.credential
                val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                val googleIdToken = googleIdTokenCredential.idToken

                val signInResult = signInWithGoogleUseCase(googleIdToken)
                _authState.value = if (signInResult.isSuccess) {
                    AuthState.Success(signInResult.getOrNull()!!)
                } else {
                    AuthState.Error(signInResult.exceptionOrNull()?.message ?: "Google Sign-In failed")
                }
            } catch (e: Exception) {
                _authState.value = AuthState.Error(e.message ?: "An unknown error occurred during Google sign-in.")
            }
        }
    }

    fun onFacebookLoginClick(token: AccessToken) {
        val credential = FacebookAuthProvider.getCredential(token.token)

        auth.signInWithCredential(credential)
            .addOnCompleteListener { task ->
                if (task.isSuccessful){
                    val user = auth.currentUser
                    _authState.value = AuthState.Success(
                        User(
                            id = user!!.uid,
                            name = user.displayName ?: "",
                            email = user.email ?: ""
                        )
                    )
                } else {
                    _authState.value = AuthState.Error(task.exception?.message ?: "Facebook Sign-In failed")
                }
            }
    }

    fun onSignInLinkClick() {
        // TODO: Navigate to Sign In screen
    }

    fun onBackNavigationClick() {
        // TODO: Handle back navigation
    }
}