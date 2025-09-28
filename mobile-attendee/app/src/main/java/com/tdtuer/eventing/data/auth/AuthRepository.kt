package com.tdtuer.eventing.data.auth

import kotlinx.coroutines.flow.Flow
import com.tdtuer.eventing.domain.model.User

interface AuthRepository {
    suspend fun signUp(email: String, password: String, role: String): Result<User>
    suspend fun signIn(email: String, password: String): Result<User>
    fun getCurrentUser(): Flow<User?>
    suspend fun signOut()
}