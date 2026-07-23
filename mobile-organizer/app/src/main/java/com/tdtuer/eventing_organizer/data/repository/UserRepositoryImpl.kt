package com.tdtuer.eventing_organizer.data.repository

import android.content.Context
import android.net.Uri
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import com.tdtuer.eventing_organizer.data.mapper.toDomainModel
import com.tdtuer.eventing_organizer.data.network.EventApiService
import com.tdtuer.eventing_organizer.data.network.model.UpdateUserRequest
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.model.User
import com.tdtuer.eventing_organizer.domain.model.failure
import com.tdtuer.eventing_organizer.domain.model.success
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import java.util.concurrent.CancellationException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    private val apiService: EventApiService
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
            if (e is CancellationException) throw e

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
            if (e is CancellationException) throw e
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
                Result.Success(uploadResponse.url)
            } else {
                Result.Failure(Exception("Upload failed with code: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }
}