package com.tdtuer.eventing.data.auth

import kotlinx.coroutines.flow.Flow
import com.tdtuer.eventing.domain.model.User
import com.facebook.AccessToken

interface AuthRepository {
    suspend fun signUp(name: String, email: String, password: String, role: String): Result<User>
    suspend fun signIn(email: String, password: String): Result<User>

    suspend fun signInWithGoogle(idToken: String): Result<User>
    suspend fun signInWithFacebook(token: AccessToken): Result<User>

    fun getCurrentUser(): Flow<User?>
    suspend fun signOut()
}