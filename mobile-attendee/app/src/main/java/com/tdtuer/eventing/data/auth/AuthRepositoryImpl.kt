package com.tdtuer.eventing.data.auth

import android.util.Log
import com.facebook.AccessToken
import com.tdtuer.eventing.data.auth.TokenStore
import com.tdtuer.eventing.data.network.EventApiService
import com.tdtuer.eventing.data.network.model.AuthLoginRequest
import com.tdtuer.eventing.data.network.model.AuthRegisterRequest
import com.tdtuer.eventing.data.network.model.AuthResponse
import com.tdtuer.eventing.data.network.model.GoogleLoginRequest
import com.tdtuer.eventing.data.network.model.FacebookLoginRequest
import com.tdtuer.eventing.data.network.model.PasswordResetRequest
import com.tdtuer.eventing.data.network.model.PasswordResetConfirmRequest
import com.tdtuer.eventing.data.network.model.EmailVerificationRequest
import com.tdtuer.eventing.data.network.model.EmailVerificationConfirmRequest
import com.tdtuer.eventing.data.network.model.RemoveTokenRequest
import com.tdtuer.eventing.data.network.model.UserDto
import com.tdtuer.eventing.data.network.model.toDomainUser
import com.tdtuer.eventing.domain.model.JoinedEvent
import com.tdtuer.eventing.domain.model.User
import com.onesignal.OneSignal
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

class AuthRepositoryImpl @Inject constructor(
    private val apiService: EventApiService,
    private val tokenStore: TokenStore
) : AuthRepository {

    private suspend fun saveBackendAuth(body: AuthResponse?, fallbackMessage: String): Result<User> {
        val accessToken = body?.accessToken
        val refreshToken = body?.refreshToken
        val userDto = body?.user
        return if (accessToken != null && refreshToken != null && userDto != null) {
            tokenStore.saveTokens(accessToken, refreshToken)
            Result.success(userDto.toDomainUser())
        } else {
            Result.failure(Exception(fallbackMessage))
        }
    }

    private fun getUserIdFromToken(): String? {
        val token = kotlinx.coroutines.runBlocking { tokenStore.getAccessToken() }
        if (token.isNullOrBlank()) return null
        return try {
            val parts = token.split(".")
            if (parts.size >= 2) {
                val payload = String(android.util.Base64.decode(parts[1], android.util.Base64.DEFAULT))
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
            val backendRole = when (role) {
                "attendee" -> "user"
                else -> role
            }
            val response = apiService.register(
                AuthRegisterRequest(
                    name = name,
                    email = email,
                    password = password,
                    role = backendRole
                )
            )
            if (response.isSuccessful) {
                val body = response.body()
                saveBackendAuth(body, "Backend registration returned an invalid response")
            } else {
                Result.failure(Exception("Backend registration failed with code: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun signIn(
        email: String,
        password: String
    ): Result<User> {
        return try {
            val response = apiService.login(AuthLoginRequest(email = email, password = password))
            if (response.isSuccessful) {
                val body = response.body()
                saveBackendAuth(body, "Backend login returned an invalid response")
            } else {
                Result.failure(Exception("Backend login failed with code: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun signInWithGoogle(idToken: String): Result<User> {
        return try {
            val response = apiService.googleLogin(GoogleLoginRequest(idToken = idToken, role = "user"))
            if (response.isSuccessful) {
                val body = response.body()
                saveBackendAuth(body, "Google login returned an invalid response")
            } else {
                Result.failure(Exception("Google login failed with code: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun signInWithFacebook(token: AccessToken): Result<User> {
        return try {
            val response = apiService.facebookLogin(FacebookLoginRequest(accessToken = token.token, role = "user"))
            if (response.isSuccessful) {
                val body = response.body()
                saveBackendAuth(body, "Facebook login returned an invalid response")
            } else {
                Result.failure(Exception("Facebook login failed with code: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override fun getCurrentUser(): Flow<User?> = callbackFlow {
        val backendAccessToken = runCatching { tokenStore.getAccessToken() }.getOrNull()
        if (!backendAccessToken.isNullOrBlank()) {
            val response = try {
                apiService.getUserProfile()
            } catch (e: Exception) {
                null
            }
            if (response != null && response.isSuccessful) {
                val dto = response.body()
                if (dto != null) {
                    val user = toDomainUser(dto)
                    trySend(user)
                    close()
                    awaitClose { }
                    return@callbackFlow
                }
            }
        }
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
                return Result.failure(Exception("Failed to retrieve user email for verification"))
            }
            val response = apiService.requestEmailVerification(EmailVerificationRequest(email))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Email verification request failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun checkEmailVerificationStatus(): Result<Boolean> {
        return try {
            val response = apiService.getUserProfile()
            if (response.isSuccessful) {
                Result.success(response.body()?.emailVerified ?: false)
            } else {
                Result.failure(Exception("Failed to fetch email verification status"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun applyVerificationCode(code: String): Result<Unit> {
        return try {
            val response = apiService.confirmEmailVerification(EmailVerificationConfirmRequest(code))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Email verification confirmation failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
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

    override suspend fun sendPasswordResetEmail(email: String): Result<Unit> {
        return try {
            val response = apiService.requestPasswordReset(PasswordResetRequest(email))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Password reset request failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun verifyPasswordResetCode(code: String): Result<String> {
        return Result.success(code)
    }

    override suspend fun confirmPasswordReset(code: String, newPassword: String): Result<Unit> {
        return try {
            val response = apiService.confirmPasswordReset(PasswordResetConfirmRequest(code, newPassword))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Password reset confirmation failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

}

private fun toDomainUser(dto: UserDto): User {
    return User(
        id = dto.id ?: "",
        email = dto.email ?: "",
        name = dto.userName ?: "",
        profilePicUrl = dto.profilePicUrl ?: "",
        coverPhotoUrl = dto.coverPhotoUrl ?: "",
        isOrganizer = dto.isOrganizer ?: false,
        bio = dto.aboutMe ?: "",
        birthDate = dto.birthDate ?: 0L,
        address = dto.address ?: "",
        interests = dto.interests ?: emptyList(),
        followersCount = dto.followersCount ?: 0,
        followingCount = dto.followingCount ?: 0,
        followedProfileIds = dto.followedProfileIds ?: emptyList(),
        joinedEvents = dto.joinedEvents?.map { je ->
            JoinedEvent(
                id = je.id ?: "",
                name = je.name ?: "",
                date = je.date ?: 0L,
                imageUrl = je.imageUrl ?: ""
            )
        } ?: emptyList(),
        role = if (dto.isOrganizer == true) listOf("attendee", "organizer") else listOf("attendee")
    )
}
