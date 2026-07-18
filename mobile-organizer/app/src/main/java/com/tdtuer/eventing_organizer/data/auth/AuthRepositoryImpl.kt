package com.tdtuer.eventing_organizer.data.auth

import android.util.Base64
import com.facebook.AccessToken
import com.tdtuer.eventing_organizer.data.mapper.toDomainModel
import com.tdtuer.eventing_organizer.data.network.AuthApiService
import com.tdtuer.eventing_organizer.data.network.EventApiService
import com.tdtuer.eventing_organizer.data.network.model.GoogleLoginRequest
import com.tdtuer.eventing_organizer.data.network.model.FacebookLoginRequest
import com.tdtuer.eventing_organizer.data.network.model.PasswordResetRequest
import com.tdtuer.eventing_organizer.data.network.model.PasswordResetConfirmRequest
import com.tdtuer.eventing_organizer.data.network.model.EmailVerificationRequest
import com.tdtuer.eventing_organizer.data.network.model.EmailVerificationConfirmRequest
import com.tdtuer.eventing_organizer.data.network.model.LoginRequest
import com.tdtuer.eventing_organizer.data.network.model.LoginResponse
import com.tdtuer.eventing_organizer.data.network.model.RegisterRequest
import com.tdtuer.eventing_organizer.data.network.model.RemoveTokenRequest
import com.tdtuer.eventing_organizer.data.preferences.TokenStore
import com.onesignal.OneSignal
import com.tdtuer.eventing_organizer.domain.model.User
import com.tdtuer.eventing_organizer.helpers.UserFacingErrors
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

class AuthRepositoryImpl @Inject constructor(
    private val apiService: EventApiService,
    private val authApiService: AuthApiService,
    private val tokenStore: TokenStore
) : AuthRepository {

    private suspend fun saveBackendAuth(body: LoginResponse, fallbackMessage: String): Result<User> {
        tokenStore.saveTokens(body.accessToken, body.refreshToken, body.tokenType ?: "Bearer")
        val userDto = body.user
        val roles = userDto?.roles ?: emptyList()
        return Result.success(
            User(
                id = userDto?.id ?: "",
                name = userDto?.name ?: "",
                email = userDto?.email ?: "",
                profilePicUrl = userDto?.profilePicUrl ?: "",
                role = roles,
                isOrganizer = roles.contains("organizer")
            )
        )
    }

    private suspend fun saveBackendAuth(body: com.tdtuer.eventing_organizer.data.network.model.RegisterResponse, fallbackMessage: String): Result<User> {
        tokenStore.saveTokens(body.accessToken, body.refreshToken, body.tokenType ?: "Bearer")
        val userDto = body.user
        val roles = userDto?.roles ?: emptyList()
        return Result.success(
            User(
                id = userDto?.id ?: "",
                name = userDto?.name ?: "",
                email = userDto?.email ?: "",
                profilePicUrl = userDto?.profilePicUrl ?: "",
                role = roles,
                isOrganizer = roles.contains("organizer")
            )
        )
    }

    private fun getUserIdFromToken(): String? {
        val token = kotlinx.coroutines.runBlocking { tokenStore.getAccessToken() }
        if (token.isNullOrBlank()) return null
        return try {
            val parts = token.split(".")
            if (parts.size >= 2) {
                val payload = String(Base64.decode(parts[1], Base64.DEFAULT))
                val jsonObject = org.json.JSONObject(payload)
                jsonObject.optString("uid")
            } else null
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun signUp(
        name: String,
        email: String,
        password: String,
        role: String
    ): Result<User> {
        return try {
            val response = authApiService.register(
                RegisterRequest(name, email, password, role = "organizer")
            )
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    saveBackendAuth(body, "Backend registration returned an invalid response")
                } else {
                    Result.failure(UserFacingErrors.failure("Could not complete registration. Please try again."))
                }
            } else {
                if (response.code() == 409) {
                    Result.failure(UserCollisionException())
                } else {
                    Result.failure(UserFacingErrors.fromHttp(response.code(), response.errorBody()?.string(), "Could not create your account."))
                }
            }
        } catch (e: Exception) { Result.failure(UserFacingErrors.failure(e))
        }
    }

    override suspend fun signIn(
        email: String,
        password: String
    ): Result<User> {
        return try {
            val response = authApiService.login(LoginRequest(email, password))
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    saveBackendAuth(body, "Backend login returned an invalid response")
                } else {
                    Result.failure(UserFacingErrors.failure("Could not sign in. Please try again."))
                }
            } else {
                Result.failure(UserFacingErrors.fromHttp(response.code(), response.errorBody()?.string(), "Incorrect email or password."))
            }
        } catch (e: Exception) { Result.failure(UserFacingErrors.failure(e))
        }
    }

    override suspend fun signInWithGoogle(idToken: String): Result<User> {
        return try {
            val response = authApiService.googleLogin(GoogleLoginRequest(idToken = idToken, role = "organizer"))
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    saveBackendAuth(body, "Google login returned an invalid response")
                } else {
                    Result.failure(UserFacingErrors.failure("Google sign-in failed. Please try again."))
                }
            } else {
                Result.failure(UserFacingErrors.fromHttp(response.code(), response.errorBody()?.string(), "Google sign-in failed. Please try again."))
            }
        } catch (e: Exception) { Result.failure(UserFacingErrors.failure(e))
        }
    }

    override suspend fun signInWithFacebook(token: AccessToken): Result<User> {
        return try {
            val response = authApiService.facebookLogin(FacebookLoginRequest(accessToken = token.token, role = "organizer"))
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    saveBackendAuth(body, "Facebook login returned an invalid response")
                } else {
                    Result.failure(UserFacingErrors.failure("Facebook sign-in failed. Please try again."))
                }
            } else {
                Result.failure(UserFacingErrors.fromHttp(response.code(), response.errorBody()?.string(), "Facebook sign-in failed. Please try again."))
            }
        } catch (e: Exception) { Result.failure(UserFacingErrors.failure(e))
        }
    }

    override fun getCurrentUser(): Flow<User?> = callbackFlow {
        try {
            val token = tokenStore.getAccessToken()
            if (!token.isNullOrBlank()) {
                val response = apiService.getUserProfile()
                if (response.isSuccessful) {
                    val dto = response.body()
                    if (dto != null) {
                        trySend(dto.toDomainModel())
                        close()
                        awaitClose { }
                        return@callbackFlow
                    }
                }
            }
        } catch (_: Exception) {
        }
        tokenStore.clearTokens()
        trySend(null)
        close()
        awaitClose { }
    }

    override fun getCurrentUserId(): String? {
        return getUserIdFromToken()
    }

    override suspend fun sendEmailVerification(): Result<Unit> {
        return try {
            val userResponse = apiService.getUserProfile()
            val email = if (userResponse.isSuccessful) userResponse.body()?.email else null
            if (email.isNullOrEmpty()) {
                return Result.failure(UserFacingErrors.failure("We could not find your email for verification."))
            }
            val response = authApiService.requestEmailVerification(EmailVerificationRequest(email))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(UserFacingErrors.fromHttp(response.code(), response.errorBody()?.string(), "Could not send verification email."))
            }
        } catch (e: Exception) { Result.failure(UserFacingErrors.failure(e))
        }
    }

    override suspend fun checkEmailVerificationStatus(): Result<Boolean> {
        return try {
            val response = apiService.getUserProfile()
            if (response.isSuccessful) {
                Result.success(response.body()?.emailVerified ?: false)
            } else {
                Result.failure(UserFacingErrors.fromHttp(response.code(), response.errorBody()?.string(), "Could not check verification status."))
            }
        } catch (e: Exception) { Result.failure(UserFacingErrors.failure(e))
        }
    }

    override suspend fun applyVerificationCode(code: String): Result<Unit> {
        return try {
            val response = authApiService.confirmEmailVerification(EmailVerificationConfirmRequest(code))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(UserFacingErrors.fromHttp(response.code(), response.errorBody()?.string(), "Invalid or expired verification code."))
            }
        } catch (e: Exception) { Result.failure(UserFacingErrors.failure(e))
        }
    }

    override suspend fun signOut() {
        try {
            OneSignal.logout()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        tokenStore.clearTokens()
    }

    override suspend fun signOutAllDevices(): Result<Unit> {
        return try {
            val response = authApiService.logoutAll()
            if (response.isSuccessful) {
                try {
                    OneSignal.logout()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                tokenStore.clearTokens()
                Result.success(Unit)
            } else {
                Result.failure(UserFacingErrors.fromHttp(response.code(), response.errorBody()?.string(), "Could not sign out other devices."))
            }
        } catch (e: Exception) { Result.failure(UserFacingErrors.failure(e))
        }
    }

    override suspend fun sendPasswordResetEmail(email: String): Result<Unit> {
        return try {
            val response = authApiService.requestPasswordReset(PasswordResetRequest(email))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(UserFacingErrors.fromHttp(response.code(), response.errorBody()?.string(), "Could not send password reset email."))
            }
        } catch (e: Exception) { Result.failure(UserFacingErrors.failure(e))
        }
    }

    override suspend fun verifyPasswordResetCode(code: String): Result<String> {
        return Result.success(code)
    }

    override suspend fun confirmPasswordReset(code: String, newPassword: String): Result<Unit> {
        return try {
            val response = authApiService.confirmPasswordReset(PasswordResetConfirmRequest(code, newPassword))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(UserFacingErrors.fromHttp(response.code(), response.errorBody()?.string(), "Could not reset password."))
            }
        } catch (e: Exception) { Result.failure(UserFacingErrors.failure(e))
        }
    }
}
