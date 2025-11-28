package com.tdtuer.eventing.data.repository

import android.net.Uri
import android.util.Log
import com.google.firebase.storage.FirebaseStorage
import com.tdtuer.eventing.data.mapper.toDomainModel
import com.tdtuer.eventing.data.network.EventApiService
import com.tdtuer.eventing.data.network.model.UpdateUserRequest
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.User
import com.tdtuer.eventing.domain.model.failure
import com.tdtuer.eventing.domain.model.success
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepositoryImpl @Inject constructor(
    private val apiService: EventApiService,
    private val storage: FirebaseStorage
) : UserRepository {

    override suspend fun getUserProfile(): Flow<Result<User>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getUserProfile()
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!.toDomainModel()
                emit(Result.Success(user))
            } else {
                emit(Result.Failure(Exception("Failed to fetch profile: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.Failure(e))
        }
    }

    override suspend fun updateUserProfile(request: UpdateUserRequest): Flow<Result<User>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.updateUserProfile(request)
            //Log.d("UpdateUserProfileUseCase", "Response: $response")
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!.toDomainModel()
                emit(Result.Success(user))
            } else {
                emit(Result.Failure(Exception("Failed to update profile: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.Failure(e))
        }
    }

    override suspend fun uploadImage(uri: Uri, path: String): Result<String> {
        return try {
            val storageRef = storage.reference.child(path)
            // Upload file
            storageRef.putFile(uri).await()
            // Lấy download URL
            val downloadUrl = storageRef.downloadUrl.await().toString()
            Result.success(downloadUrl)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun followProfile(profileId: String): Result<Unit> {
        return try {
            val response = apiService.followProfile(mapOf("profileId" to profileId))
            if (response.isSuccessful) Result.Success(Unit)
            else Result.Failure(Exception("Follow failed"))
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    override suspend fun unfollowProfile(profileId: String): Result<Unit> {
        return try {
            val response = apiService.unfollowProfile(profileId)
            if (response.isSuccessful) Result.Success(Unit)
            else Result.Failure(Exception("Unfollow failed"))
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }
}