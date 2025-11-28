package com.tdtuer.eventing.data.repository

import android.net.Uri
import com.tdtuer.eventing.data.network.model.UpdateUserRequest
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.User
import kotlinx.coroutines.flow.Flow

interface UserRepository {
    suspend fun getUserProfile(): Flow<Result<User>>
    suspend fun updateUserProfile(request: UpdateUserRequest): Flow<Result<User>>

    suspend fun uploadImage(uri: Uri, path: String): Result<String>

    suspend fun followProfile(profileId: String): Result<Unit>
    suspend fun unfollowProfile(profileId: String): Result<Unit>
}