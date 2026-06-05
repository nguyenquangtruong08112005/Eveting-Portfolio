package com.tdtuer.eventing.data.repository

import android.content.Context
import android.net.Uri
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
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
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    private val apiService: EventApiService,
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

    private fun mapPathToPurpose(path: String): String {
        val lower = path.lowercase()
        return when {
            lower.contains("avatar") || lower.contains("cover") || lower.contains("profile") || lower.contains("user") -> "profile"
            lower.contains("banner") || lower.contains("thumbnail") || lower.contains("video") -> "event"
            lower.contains("media") || lower.contains("upload") -> "media"
            lower.contains("event") -> "event"
            else -> "misc"
        }
    }

    override suspend fun uploadImage(uri: Uri, path: String): Result<String> {
        return try {
            val contentResolver = context.contentResolver
            val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
            val bytes = contentResolver.openInputStream(uri)?.use { it.readBytes() }
                ?: throw Exception("Failed to read URI content")

            val requestBody = bytes.toRequestBody(mimeType.toMediaTypeOrNull(), 0, bytes.size)

            val fileName = contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                if (nameIndex != -1 && cursor.moveToFirst()) {
                    cursor.getString(nameIndex)
                } else null
            } ?: uri.lastPathSegment ?: "file.jpg"

            val filePart = MultipartBody.Part.createFormData("file", fileName, requestBody)

            val purposeStr = mapPathToPurpose(path)
            val purposePart = purposeStr.toRequestBody("text/plain".toMediaTypeOrNull())

            val response = apiService.uploadImage(filePart, purposePart)
            if (response.isSuccessful && response.body() != null) {
                val uploadResponse = response.body()!!
                Result.success(uploadResponse.url)
            } else {
                Result.failure(Exception("Upload failed with code: ${response.code()}"))
            }
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