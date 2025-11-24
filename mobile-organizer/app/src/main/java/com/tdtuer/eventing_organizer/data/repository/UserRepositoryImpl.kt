package com.tdtuer.eventing_organizer.data.repository

import android.net.Uri
import com.google.firebase.storage.FirebaseStorage
import com.tdtuer.eventing_organizer.data.mapper.toDomainModel
import com.tdtuer.eventing_organizer.data.network.EventApiService
import com.tdtuer.eventing_organizer.data.network.model.UpdateUserRequest
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.model.User
import com.tdtuer.eventing_organizer.domain.model.failure
import com.tdtuer.eventing_organizer.domain.model.success
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
}