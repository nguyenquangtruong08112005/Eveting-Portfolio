package com.tdtuer.eventing_organizer.data.repository

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import com.tdtuer.eventing_organizer.data.mapper.toDomainModel
import com.tdtuer.eventing_organizer.data.network.EventApiService
import com.tdtuer.eventing_organizer.data.network.model.AttendeeDto
import com.tdtuer.eventing_organizer.data.network.model.BroadcastRequest
import com.tdtuer.eventing_organizer.data.network.model.CheckInRequest
import com.tdtuer.eventing_organizer.data.network.model.CheckInResponse
import com.tdtuer.eventing_organizer.data.network.model.CreateEventRequest
import com.tdtuer.eventing_organizer.data.network.model.CreateProfileRequest
import com.tdtuer.eventing_organizer.data.network.model.DashboardStatsResponse
import com.tdtuer.eventing_organizer.data.network.model.EventStatsResponse
import com.tdtuer.eventing_organizer.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing_organizer.data.network.model.MediaItemRequest
import com.tdtuer.eventing_organizer.data.network.model.MyEventDto
import com.tdtuer.eventing_organizer.data.network.model.OrganizerProfileResponse
import com.tdtuer.eventing_organizer.data.network.model.PostMediaRequest
import com.tdtuer.eventing_organizer.data.network.model.PostReviewRequest
import com.tdtuer.eventing_organizer.data.network.model.RegisterOrganizerRequest
import com.tdtuer.eventing_organizer.data.network.model.UpdateOrganizerProfileRequest
import com.tdtuer.eventing_organizer.data.network.model.VenueResponse
import com.tdtuer.eventing_organizer.domain.model.Event
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.model.Weather
import com.tdtuer.eventing_organizer.domain.model.failure
import com.tdtuer.eventing_organizer.domain.model.success
import com.tdtuer.eventing_organizer.ui.model.MediaItem
import com.tdtuer.eventing_organizer.ui.model.ReviewItem
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.ResponseBody
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.io.OutputStream
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class EventRepositoryImpl @Inject constructor(
    private val apiService: EventApiService,
    @ApplicationContext private val context: Context
) : EventRepository {

    override fun getAllEvents(
        page: Int,
        limit: Int,
    ): Flow<Result<List<Event>>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getAllEvents(
                page = page,
                limit = limit
            )

            if (response.isSuccessful && response.body() != null) {

                val eventDtoList = response.body()!!.events

                val domainEventList = eventDtoList.map { eventDto ->
                    eventDto.toDomainModel()
                }

                // SỬA LẠI:
                emit(Result.success(domainEventList))
            } else {
                // Lỗi server (4xx, 5xx)
                // SỬA LẠI:
                emit(Result.failure(Exception("Server error: ${response.code()}")))
            }

        } catch (e: Exception) {
            // SỬA LẠI:
            emit(Result.failure(e))
        }
    }

    override fun getEventById(eventId: String): Flow<Result<Event>> = flow {
        try {
            val response = apiService.getEventById(eventId)
            if (response.isSuccessful && response.body() != null) {
                val domainEvent = response.body()!!.toDomainModel()
                emit(Result.success(domainEvent))
            } else {
                emit(Result.failure(Exception("Event not found or server error: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    override fun findNearbyEvents(
        lat: String,
        lon: String,
        radiusInKm: Double?,
        page: Int,
        limit: Int
    ): Flow<Result<List<Event>>> = flow {
        try {
            val response = apiService.findNearbyEvents(lat, lon, radiusInKm, page, limit)
            if (response.isSuccessful && response.body() != null) {
                val domainList = response.body()!!.events.map { it.toDomainModel() }
                emit(Result.success(domainList))
            } else {
                emit(Result.failure(Exception("Server error: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    override fun searchEvents(
        query: String?,
        location: String?,
        category: String?,
        datePreset: String?,
        startDate: Long?,
        endDate: Long?,
        minPrice: Double?,
        maxPrice: Double?,
        sortBy: String?,
        sortOrder: String?,
        page: Int,
        limit: Int,
        hasVideo: Boolean?
    ): Flow<Result<List<Event>>> = flow {
        try {
            val response = apiService.searchEvents(
                //
                query = query,
                location = location,
                category = category,
                datePreset = datePreset,
                startDate = startDate,
                endDate = endDate,
                minPrice = minPrice,
                maxPrice = maxPrice,
                sortBy = sortBy,
                sortOrder = sortOrder,
                page = page,
                limit = limit,
                hasVideo = hasVideo,
            )
            if (response.isSuccessful && response.body() != null) {
                val domainList = response.body()!!.events.map { it.toDomainModel() }
                emit(Result.success(domainList))
            } else {
                emit(Result.failure(Exception("Server error: ${response.errorBody()}")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    // Thêm vào Interface và Impl
    override fun getEventReviews(eventId: String): Flow<Result<List<ReviewItem>>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getEventReviews(eventId)
            if (response.isSuccessful && response.body() != null) {
                // Map từ DTO -> Domain Model
                val reviews = response.body()!!.reviews.map { dto ->
                    ReviewItem(
                        userName = dto.user?.name ?: "Unknown",
                        avatarUrl = dto.user?.profilePicUrl ?: "",
                        rating = dto.rating,
                        comment = dto.comment
                    )
                }
                emit(Result.success(reviews))
            } else {
                emit(Result.failure(Exception("Error fetching reviews: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    override suspend fun postEventReview(
        eventId: String,
        rating: Int,
        comment: String
    ): Result<Unit> {
        return try {
            val request = PostReviewRequest(rating, comment)
            val response = apiService.postEventReview(eventId, request)
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed to post review: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Tương tự cho Media...
    override fun getEventMedia(eventId: String): Flow<Result<List<MediaItem>>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getEventMedia(eventId)
            if (response.isSuccessful && response.body() != null) {
                val mediaList = response.body()!!.media.map { dto ->
                    MediaItem(url = dto.url, type = dto.type)
                }
                emit(Result.success(mediaList))
            } else {
                emit(Result.failure(Exception("Error fetching media")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    override suspend fun postEventMedia(eventId: String, url: String, type: String): Result<Unit> {
        return try {
            // Bọc single item vào mảng để khớp với yêu cầu Backend
            val item = MediaItemRequest(url = url, type = type, caption = "")
            val request = PostMediaRequest(mediaItems = listOf(item))

            val response = apiService.postEventMedia(eventId, request)
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed to upload media info"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override fun getRecommendations(limit: Int): Flow<Result<List<Event>>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getRecommendations(limit)

            if (response.isSuccessful && response.body() != null) {
                // Response body bây giờ là List<EventDto>, không cần .events nữa
                val eventDtos = response.body()!!
                val events = eventDtos.map { it.toDomainModel() }

                emit(Result.success(events))
            } else {
                emit(Result.failure(Exception("Failed to get recommendations: ${response.code()}")))
            }
        } catch (e: Exception) {
            // Log lỗi ra để dễ debug nếu vẫn không lên
            e.printStackTrace()
            emit(Result.failure(e))
        }
    }

    override fun getEventWeather(eventId: String): Flow<Result<Weather>> = flow {
        // Không cần emit Loading ở đây vì Weather chỉ là phụ,
        // UI sẽ tự hiển thị khi có data, không cần xoay vòng loading toàn màn hình
        try {
            val response = apiService.getWeather(eventId)

            if (response.isSuccessful && response.body() != null) {
                val weatherData = response.body()!!.toDomainModel()
                emit(Result.success(weatherData))
            } else {
                // Nếu lỗi hoặc không có weather (ví dụ sự kiện trong nhà),
                // ta có thể emit failure hoặc đơn giản là không làm gì
                emit(Result.failure(Exception("Weather info not available: ${response.code()}")))
            }
        } catch (e: Exception) {
            e.printStackTrace()
            emit(Result.failure(e))
        }
    }

    override suspend fun registerOrganizer(request: RegisterOrganizerRequest): Result<Unit> {
        return try {
            val response = apiService.registerOrganizer(request)
            if (response.isSuccessful) Result.Success(Unit)
            else Result.Failure(Exception(response.message()))
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    override fun getOrganizerProfile(): Flow<Result<OrganizerProfileResponse>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getOrganizerProfile()
            if (response.isSuccessful && response.body() != null) {
                emit(Result.Success(response.body()!!))
            } else {
                emit(Result.Failure(Exception("Failed to fetch organizer profile: ${response.code()} ${response.message()}")))
            }
        } catch (e: Exception) {
            emit(Result.Failure(e))
        }
    }

    override fun getMyEvents(status: String?, page: Int, limit: Int): Flow<Result<List<MyEventDto>>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getMyEvents(status = status, page = page, limit = limit)
            if (response.isSuccessful && response.body() != null) {
                emit(Result.Success(response.body()!!.data))
            } else {
                emit(Result.Failure(Exception("Error: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.Failure(e))
        }
    }

    override fun getDashboardStats(): Flow<Result<DashboardStatsResponse>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getDashboardStats()
            if (response.isSuccessful && response.body() != null) {
                emit(Result.Success(response.body()!!))
            } else {
                emit(Result.Failure(Exception("Error: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.Failure(e))
        }
    }

    override suspend fun createEvent(request: CreateEventRequest): Result<Unit> {
        return try {
            val response = apiService.createEvent(request)
            if (response.isSuccessful) Result.Success(Unit)
            else Result.Failure(Exception("Create failed: ${response.code()}"))
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    override suspend fun checkInTicket(qrToken: String): Result<CheckInResponse> {
        return try {
            val response = apiService.checkInQr(CheckInRequest(qrToken))
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Check-in failed"
                Result.Failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    // --- Admin Impl ---
    override fun getPendingEvents(): Flow<Result<List<MyEventDto>>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getPendingEvents()
            if (response.isSuccessful && response.body() != null) {
                emit(Result.Success(response.body()!!))
            } else {
                emit(Result.Failure(Exception("Error loading pending events: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.Failure(e))
        }
    }

    override suspend fun approveEvent(eventId: String): Result<Unit> {
        return try {
            val response = apiService.approveEvent(eventId)
            if (response.isSuccessful) Result.Success(Unit)
            else Result.Failure(Exception("Failed"))
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    override suspend fun rejectEvent(eventId: String, reason: String): Result<Unit> {
        return try {
            val response = apiService.rejectEvent(eventId, mapOf("reason" to reason))
            if (response.isSuccessful) Result.Success(Unit)
            else Result.Failure(Exception("Failed"))
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    override suspend fun updateOrganizerProfile(request: UpdateOrganizerProfileRequest): Result<OrganizerProfileResponse> {
        return try {
            val response = apiService.updateOrganizerProfile(request)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Failure(Exception("Update failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    override fun getEventAttendees(eventId: String): Flow<Result<List<AttendeeDto>>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getEventAttendees(eventId)
            if (response.isSuccessful && response.body() != null) {
                emit(Result.Success(response.body()!!.attendees))
            } else {
                emit(Result.Failure(Exception("Error fetching attendees: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.Failure(e))
        }
    }

    override fun getVenues(): Flow<Result<List<VenueResponse>>> = flow {
        try {
            val response = apiService.getVenues()
            if (response.isSuccessful && response.body() != null) {
                emit(Result.Success(response.body()!!))
            } else {
                emit(Result.Failure(Exception("Failed to load venues")))
            }
        } catch (e: Exception) {
            emit(Result.Failure(e))
        }
    }

    override fun getFeaturedProfiles(): Flow<Result<List<FeaturedProfileDto>>> = flow {
        try {
            val response = apiService.getFeaturedProfiles()
            if (response.isSuccessful && response.body() != null) {
                val profilesList = response.body()!!.profiles
                emit(Result.Success(profilesList))
            } else {
                emit(Result.Failure(Exception("Failed to load profiles: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.Failure(e))
        }
    }

    override suspend fun createFeaturedProfile(
        name: String,
        bio: String,
        imageUrl: String?,
        profileType: String,
        genres: List<String>
    ): Result<FeaturedProfileDto> {
        return try {
            val request = CreateProfileRequest(
                name = name,
                bio = bio,
                imageUrl = imageUrl,
                profileType = profileType,
                genres = genres
            )
            val response = apiService.createFeaturedProfile(request)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Failure(Exception("Create profile failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    override fun getEventStats(eventId: String): Flow<Result<EventStatsResponse>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getEventStats(eventId)
            if (response.isSuccessful && response.body() != null) {
                emit(Result.Success(response.body()!!))
            } else {
                emit(Result.Failure(Exception("Failed to load event stats")))
            }
        } catch (e: Exception) {
            emit(Result.Failure(e))
        }
    }

    override suspend fun updateEvent(eventId: String, request: CreateEventRequest): Result<Unit> {
        return try {
            val response = apiService.updateEvent(eventId, request)
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Failure(Exception("Update failed: ${response.code()} ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    override suspend fun importAttendees(eventId: String, file: File): Result<Unit> {
        return try {
            val requestFile = file.asRequestBody("multipart/form-data".toMediaTypeOrNull())
            val body = MultipartBody.Part.createFormData("file", file.name, requestFile)

            val response = apiService.importAttendees(eventId, body)
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Failure(Exception("Import failed: ${response.code()} ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    override suspend fun exportAttendees(eventId: String): Result<String> {
        return try {
            val response = apiService.exportAttendees(eventId)
            if (response.isSuccessful && response.body() != null) {
                val fileName = "Attendees_${eventId}_${System.currentTimeMillis()}.xlsx"
                // GỌI HÀM LƯU FILE CẢI TIẾN
                val path = saveFileToDownloads(response.body()!!, fileName)
                Result.Success(path)
            } else {
                Result.Failure(Exception("Export failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    override suspend fun broadcastNotification(eventId: String, title: String, message: String): Result<Unit> {
        return try {
            val request = BroadcastRequest(title, message)
            val response = apiService.broadcastNotification(eventId, request)
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Failure(Exception("Broadcast failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    /**
     * Helper: Lưu file vào thư mục Downloads Công khai
     * - Android 10+ (API 29+): Dùng MediaStore (Không cần quyền WRITE)
     * - Android < 10: Dùng Environment.getExternalStoragePublicDirectory (Cần quyền WRITE)
     */
    private fun saveFileToDownloads(body: ResponseBody, fileName: String): String {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // 1. Dùng MediaStore cho Android 10+
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }

                val resolver = context.contentResolver
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    ?: throw Exception("Không thể tạo file trong thư mục Downloads")

                resolver.openOutputStream(uri).use { outputStream ->
                    if (outputStream == null) throw Exception("Lỗi ghi file")
                    body.byteStream().use { inputStream ->
                        inputStream.copyTo(outputStream)
                    }
                }
                "Downloads/$fileName" // Trả về đường dẫn tương đối dễ hiểu
            } else {
                // 2. Dùng File API cũ cho Android < 10
                val path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!path.exists()) path.mkdirs()
                val file = File(path, fileName)

                var inputStream: InputStream? = null
                var outputStream: OutputStream? = null

                try {
                    inputStream = body.byteStream()
                    outputStream = FileOutputStream(file)
                    val buffer = ByteArray(4096)
                    while (true) {
                        val read = inputStream.read(buffer)
                        if (read == -1) break
                        outputStream.write(buffer, 0, read)
                    }
                    outputStream.flush()
                    file.absolutePath // Trả về đường dẫn tuyệt đối
                } finally {
                    inputStream?.close()
                    outputStream?.close()
                }
            }
        } catch (e: Exception) {
            throw e
        }
    }
}