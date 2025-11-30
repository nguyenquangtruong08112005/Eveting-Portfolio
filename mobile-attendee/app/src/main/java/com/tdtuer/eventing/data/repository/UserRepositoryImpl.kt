package com.tdtuer.eventing.data.repository

import android.net.Uri
import android.util.Log
import com.google.firebase.storage.FirebaseStorage
import com.tdtuer.eventing.data.local.dao.UserDao
import com.tdtuer.eventing.data.local.entity.toDomain
import com.tdtuer.eventing.data.local.entity.toEntity
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
    private val storage: FirebaseStorage,
    private val userDao: UserDao // <-- Inject DAO
) : UserRepository {

    override suspend fun getUserProfile(): Flow<Result<User>> = flow {
        // 1. Emit Local Cache trước
        var localUser: User? = null
        try {
            val entity = userDao.getUserProfile()
            localUser = entity?.toDomain()
            if (localUser != null) {
                emit(Result.Success(localUser))
            } else {
                emit(Result.Loading)
            }
        } catch (e: Exception) {
            Log.e("UserRepo", "Error reading cache: ${e.message}")
        }

        // 2. Fetch Remote & Update Cache
        try {
            val response = apiService.getUserProfile()
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!.toDomainModel()

                // Lưu vào cache
                try {
                    userDao.insertUser(user.toEntity())
                } catch (e: Exception) {
                    Log.e("UserRepo", "Error writing cache: ${e.message}")
                }

                emit(Result.Success(user))
            } else {
                // Nếu không có cache thì báo lỗi
                if (localUser == null) {
                    emit(Result.Failure(Exception("Failed to fetch profile: ${response.code()}")))
                }
            }
        } catch (e: Exception) {
            if (localUser == null) {
                emit(Result.Failure(e))
            }
        }
    }

    override suspend fun updateUserProfile(request: UpdateUserRequest): Flow<Result<User>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.updateUserProfile(request)
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!.toDomainModel()

                // Cập nhật cache sau khi update thành công
                try {
                    userDao.insertUser(user.toEntity())
                } catch (e: Exception) {
                    Log.e("UserRepo", "Error writing cache: ${e.message}")
                }

                emit(Result.Success(user))
            } else {
                emit(Result.Failure(Exception("Failed to update profile: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.Failure(e))
        }
    }

    // Các hàm khác giữ nguyên, không liên quan caching
    override suspend fun uploadImage(uri: Uri, path: String): Result<String> {
        return try {
            val storageRef = storage.reference.child(path)
            storageRef.putFile(uri).await()
            val downloadUrl = storageRef.downloadUrl.await().toString()
            Result.success(downloadUrl)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun followProfile(profileId: String): Result<Unit> {
        return try {
            // Cập nhật cache trước để UI mượt hơn
            try {
                userDao.getUserProfile()?.let { currentUser ->
                    val updatedFollowedIds = currentUser.followedProfileIds.toMutableList().apply {
                        if (!contains(profileId)) add(profileId)
                    }
                    userDao.insertUser(currentUser.copy(followedProfileIds = updatedFollowedIds))
                }
            } catch (e: Exception) {
                Log.e("UserRepo", "Failed to update follow cache: ${e.message}")
            }


            val response = apiService.followProfile(mapOf("profileId" to profileId))
            if (response.isSuccessful) {
                Result.Success(Unit)
            }
            else Result.Failure(Exception("Follow failed"))
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    override suspend fun unfollowProfile(profileId: String): Result<Unit> {
        return try {
            // Cập nhật cache trước để UI mượt hơn
            try {
                userDao.getUserProfile()?.let { currentUser ->
                    val updatedFollowedIds = currentUser.followedProfileIds.toMutableList().apply {
                        remove(profileId)
                    }
                    userDao.insertUser(currentUser.copy(followedProfileIds = updatedFollowedIds))
                }
            } catch (e: Exception) {
                Log.e("UserRepo", "Failed to update unfollow cache: ${e.message}")
            }
            val response = apiService.unfollowProfile(profileId)
            if (response.isSuccessful) Result.Success(Unit)
            else Result.Failure(Exception("Unfollow failed"))
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }
}