package com.tdtuer.eventing.data.auth

import com.facebook.AccessToken
import com.tdtuer.eventing.domain.model.User
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    suspend fun signUp(name: String, email: String, password: String, role: String): Result<User>
    suspend fun signIn(email: String, password: String): Result<User>

    suspend fun signInWithGoogle(idToken: String): Result<User>
    suspend fun signInWithFacebook(token: AccessToken): Result<User>

    fun getCurrentUser(): Flow<User?>
    suspend fun sendEmailVerification(): Result<Unit>
    suspend fun checkEmailVerificationStatus(): Result<Boolean>
    suspend fun applyVerificationCode(code: String): Result<Unit>
    suspend fun signOut()

    suspend fun verifyPasswordResetCode(code: String): Result<String> // Returns the user's email
    suspend fun confirmPasswordReset(code: String, newPassword: String): Result<Unit>
    suspend fun sendPasswordResetEmail(email: String): Result<Unit>

}
