package com.tdtuer.eventing.data.repository

import android.util.Log
import com.tdtuer.eventing.data.local.dao.EventDao
import com.tdtuer.eventing.data.local.dao.WeatherDao
import com.tdtuer.eventing.data.local.entity.toDomain
import com.tdtuer.eventing.data.local.entity.toEntity
import com.tdtuer.eventing.data.mapper.toDomainModel
import com.tdtuer.eventing.data.network.EventApiService
import com.tdtuer.eventing.data.network.model.ApplyPromotionRequest
import com.tdtuer.eventing.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing.data.network.model.MediaItemRequest
import com.tdtuer.eventing.data.network.model.PostMediaRequest
import com.tdtuer.eventing.data.network.model.PostReviewRequest
import com.tdtuer.eventing.data.network.model.PromotionDto
import com.tdtuer.eventing.data.network.model.PromotionResponse
import com.tdtuer.eventing.data.preferences.UserPreferencesRepository
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Promotion
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Weather
import com.tdtuer.eventing.domain.model.failure
import com.tdtuer.eventing.domain.model.success
import com.tdtuer.eventing.ui.screens.postevent.MediaItem
import com.tdtuer.eventing.ui.screens.postevent.ReviewItem
import kotlinx.coroutines.flow.first
import kotlin.math.*
import com.tdtuer.eventing.data.local.entity.toDomain as weatherEntityToDomain

@Singleton
class EventRepositoryImpl @Inject constructor(
    private val apiService: EventApiService,
    private val eventDao: EventDao, // Inject DAO
    private val weatherDao: WeatherDao, // [NEW]
    private val userPreferencesRepository: UserPreferencesRepository // Inject Prefs để check time
) : EventRepository {

    // --- 1. GET ALL EVENTS (Caching 15 phút) ---
    override fun getAllEvents(
        page: Int,
        limit: Int,
    ): Flow<Result<List<Event>>> = flow {
        emit(Result.Loading)

        // Lấy dữ liệu từ Local DB
        val localEvents = try {
            eventDao.getAllEvents().map { it.toDomain() }
        } catch (e: Exception) {
            emptyList()
        }

        // Kiểm tra thời gian
        val lastFetchTime = userPreferencesRepository.lastEventFetchTime.first()
        val currentTime = System.currentTimeMillis()
        val cacheTimeout = 15 * 60 * 1000 // 15 phút

        val isCacheExpired = (currentTime - lastFetchTime) > cacheTimeout
        val isLocalEmpty = localEvents.isEmpty()


        // Logic: Nếu Cache hết hạn HOẶC Local trống -> Gọi API
        if (isCacheExpired || isLocalEmpty) {
            try {
                // Emit Local trước (Stale-while-revalidate)
                if (localEvents.isNotEmpty()) {
                    emit(Result.success(localEvents))
                }

                val response = apiService.getAllEvents(page = page, limit = limit)

                if (response.isSuccessful && response.body() != null) {
                    val eventDtoList = response.body()!!.events
                    val domainEventList = eventDtoList.map { it.toDomainModel() }

                    // Lưu vào DB (Update Cache toàn bộ)
                    val entities = domainEventList.map { it.toEntity() }
                    eventDao.updateCache(entities)

                    userPreferencesRepository.setLastEventFetchTime(currentTime)

                    emit(Result.success(domainEventList))
                } else {
                    if (localEvents.isEmpty()) {
                        emit(Result.failure(Exception("Server error: ${response.code()}")))
                    }
                }
            } catch (e: Exception) {
                // Mất mạng -> Dùng Offline Data
                if (localEvents.isNotEmpty()) {
                    emit(Result.success(localEvents))
                } else {
                    emit(Result.failure(e))
                }
            }
        } else {
            emit(Result.success(localEvents))
        }
    }

    override fun getEventById(eventId: String): Flow<Result<Event>> = flow {
        // 1. Emit Local Data trước (Fast UI)
        var localEvent: Event? = null
        try {
            val entity = eventDao.getAllEvents().find { it.id == eventId }
            localEvent = entity?.toDomain()

            if (localEvent != null) {
                emit(Result.success(localEvent))
            } else {
                emit(Result.Loading)
            }
        } catch (e: Exception) {
            // Ignore local error
        }

        // 2. Fetch Remote & Update Cache
        try {
            val response = apiService.getEventById(eventId)
            if (response.isSuccessful && response.body() != null) {
                val domainEvent = response.body()!!.toDomainModel()

                // [FIX] Lưu ngược lại vào DB
                try {
                    eventDao.insertAll(listOf(domainEvent.toEntity()))
                } catch (e: Exception) {
                    Log.e("EventRepo", "Failed to cache event detail", e)
                }

                emit(Result.success(domainEvent))
            } else {
                // Chỉ báo lỗi nếu không có dữ liệu local để hiển thị
                if (localEvent == null) {
                    emit(Result.failure(Exception("Event not found: ${response.code()}")))
                }
            }
        } catch (e: Exception) {
            // Mất mạng và không có cache -> Lỗi
            if (localEvent == null) {
                emit(Result.failure(e))
            }
        }
    }

    // --- 3. FIND NEARBY (Fixed Caching) ---
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

                // --- FIX: Lưu vào Cache khi có mạng ---
                try {
                    val entities = domainList.map { it.toEntity() }
                    eventDao.insertAll(entities) // Dùng insertAll (Upsert) thay vì updateCache (Clear + Insert)
                } catch (e: Exception) {
                }
                // --------------------------------------

                emit(Result.success(domainList))
            } else {
                emit(Result.failure(Exception("Server error: ${response.code()}")))
            }
        } catch (e: Exception) {

            // OFFLINE FALLBACK: Tính khoảng cách thủ công
            val localEvents = try {
                eventDao.getAllEvents().map { it.toDomain() }
            } catch (ex: Exception) {
                emptyList()
            }

            if (localEvents.isNotEmpty()) {
                val userLat = lat.toDoubleOrNull() ?: 0.0
                val userLon = lon.toDoubleOrNull() ?: 0.0
                val radius = radiusInKm ?: 50.0

                val filtered = localEvents.filter { event ->
                    val (eLat, eLon) = parseCoordinates(event.coordinates)
                    val distance = calculateDistanceKm(userLat, userLon, eLat, eLon)
                    distance <= radius
                }
                emit(Result.success(filtered))
            } else {
                emit(Result.failure(e))
            }
        }
    }

    // --- 4. SEARCH (Fixed Caching) ---
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
                query,
                location,
                category,
                datePreset,
                startDate,
                endDate,
                minPrice,
                maxPrice,
                sortBy,
                sortOrder,
                page = page,
                limit = limit,
                hasVideo = hasVideo
            )
            if (response.isSuccessful && response.body() != null) {
                val domainList = response.body()!!.events.map { it.toDomainModel() }

                // --- FIX: Lưu vào Cache khi có mạng ---
                try {
                    val entities = domainList.map { it.toEntity() }
                    eventDao.insertAll(entities)
                } catch (e: Exception) {
                }
                // --------------------------------------

                emit(Result.success(domainList))
            } else {
                emit(Result.failure(Exception("Server error: ${response.errorBody()}")))
            }
        } catch (e: Exception) {

            // OFFLINE FALLBACK: Lọc thủ công
            val localEvents = try {
                eventDao.getAllEvents().map { it.toDomain() }
            } catch (ex: Exception) {
                emptyList()
            }

            if (localEvents.isNotEmpty()) {
                var filtered = localEvents

                // Lọc đơn giản (Tên & Category)
                if (!query.isNullOrBlank()) {
                    filtered = filtered.filter { it.name.contains(query, ignoreCase = true) }
                }
                if (!category.isNullOrBlank()) {
                    filtered =
                        filtered.filter { it.category.any { cat -> cat.equals(category, true) } }
                }

                // Lọc Video (nếu cần)
                if (hasVideo == true) {
                    filtered = filtered.filter { it.videoUrl.isNotBlank() }
                }

                emit(Result.success(filtered))
            } else {
                emit(Result.failure(e))
            }
        }
    }

    // --- 5. RECOMMENDATIONS (Fixed Caching) ---
    override fun getRecommendations(limit: Int): Flow<Result<List<Event>>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getRecommendations(limit)
            if (response.isSuccessful && response.body() != null) {
                val eventDtos = response.body()!!
                val events = eventDtos.map { it.toDomainModel() }

                // --- FIX: Lưu vào Cache ---
                try {
                    val entities = events.map { it.toEntity() }
                    eventDao.insertAll(entities)
                } catch (e: Exception) {
                }
                // -------------------------

                emit(Result.success(events))
            } else {
                emit(Result.failure(Exception("Failed to get recommendations: ${response.code()}")))
            }
        } catch (e: Exception) {

            // OFFLINE FALLBACK: Lấy ngẫu nhiên từ Local
            val localEvents = try {
                eventDao.getAllEvents().map { it.toDomain() }
            } catch (ex: Exception) {
                emptyList()
            }
            if (localEvents.isNotEmpty()) {
                val randomEvents = localEvents.shuffled().take(limit)
                emit(Result.success(randomEvents))
            } else {
                emit(Result.failure(e))
            }
        }
    }

    // Thêm vào Interface và Impl
    override fun getEventReviews(eventId: String): Flow<Result<List<ReviewItem>>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getEventReviews(eventId)
            if (response.isSuccessful && response.body() != null) {
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
            val item = MediaItemRequest(url = url, type = type, caption = "")
            val request = PostMediaRequest(mediaItems = listOf(item))

            val response = apiService.postEventMedia(eventId, request)
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed to upload media info"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Lấy thông tin thời tiết cho sự kiện.
     * Logic: Offline-First (Local -> API -> Save Local -> Emit)
     * Đã thêm Log để debug.
     * @param eventId ID của sự kiện.
     */
    override fun getEventWeather(eventId: String): Flow<Result<Weather>> = flow {
        Log.d("WeatherDebug", ">>> Bắt đầu getEventWeather cho eventId: $eventId")

        // 1. Kiểm tra Cache Local trước
        var localWeather: Weather? = null
        var isCacheValid = false

        try {
            val entity = weatherDao.getWeatherByEventId(eventId)
            if (entity != null) {
                // Kiểm tra TTL (Time To Live) - ví dụ: cache 1 giờ
                val currentTime = System.currentTimeMillis()
                val oneHourInMillis = 60 * 60 * 1000
                val age = currentTime - entity.lastUpdated

                Log.d("WeatherDebug", "Tìm thấy cache. Tuổi: ${age}ms / TTL: ${oneHourInMillis}ms")

                if (age < oneHourInMillis) {
                    localWeather = entity.weatherEntityToDomain() // Sử dụng import alias
                    isCacheValid = true
                    Log.d("WeatherDebug", "✅ Cache còn hạn. Emit dữ liệu local.")
                    emit(Result.success(localWeather))
                } else {
                    Log.d("WeatherDebug", "⚠️ Cache hết hạn. Sẽ gọi API.")
                }
            } else {
                Log.d("WeatherDebug", "❌ Không tìm thấy cache local.")
            }
        } catch (e: Exception) {
            Log.e("WeatherDebug", "Lỗi khi đọc cache thời tiết", e)
        }

        // --- QUAN TRỌNG ---
        // Nếu bạn muốn DỪNG gọi API khi cache còn hạn, hãy bỏ comment dòng dưới đây:
         if (isCacheValid) {
             Log.d("WeatherDebug", "Cache hợp lệ, DỪNG gọi API (Return).")
             return@flow
         }
        // ------------------

        // 2. Fetch từ API để cập nhật dữ liệu mới nhất
        Log.d("WeatherDebug", "📡 Đang gọi API lấy thời tiết...")
        try {
            val response = apiService.getWeather(eventId)
            if (response.isSuccessful && response.body() != null) {
                Log.d("WeatherDebug", "✅ API thành công. Body: ${response.body()}")
                val weatherDomain = response.body()!!.toDomainModel()

                // 3. Lưu vào Local Cache
                try {
                    weatherDao.saveWeather(weatherDomain.toEntity(eventId))
                    Log.d("WeatherDebug", "💾 Đã lưu vào DB thành công.")
                } catch (e: Exception) {
                    Log.e("WeatherDebug", "Lỗi khi lưu cache thời tiết", e)
                }

                // 4. Emit dữ liệu mới
                emit(Result.success(weatherDomain))
            } else {
                Log.e("WeatherDebug", "❌ API Lỗi: ${response.code()} - ${response.message()}")
                // Nếu API lỗi mà chưa có local data (hoặc cache hết hạn mà chưa emit) thì báo lỗi
                if (localWeather == null) {
                    emit(Result.failure(Exception("Weather info not available: ${response.code()}")))
                }
            }
        } catch (e: Exception) {
            Log.e("WeatherDebug", "❌ Exception khi gọi API", e)
            // Mất mạng
            if (localWeather == null) {
                // Nếu chưa có local data thì báo lỗi
                emit(Result.failure(e))
            } else {
                // Nếu đã có local data (dù hết hạn), có thể vẫn muốn hiển thị nó (fallback)
                // Ở bước 1 đã emit rồi nếu chưa hết hạn.
                // Nếu muốn luôn hiển thị cache cũ khi mất mạng:
                val entity = weatherDao.getWeatherByEventId(eventId)
                if (entity != null) {
                    Log.d("WeatherDebug", "⚠️ Mất mạng, emit cache cũ (kể cả hết hạn).")
                    emit(Result.success(entity.weatherEntityToDomain()))
                } else {
                    emit(Result.failure(e))
                }
            }
        }
    }

    override fun getFeaturedProfileById(profileId: String): Flow<Result<FeaturedProfileDto>> =
        flow {
            emit(Result.Loading)
            try {
                val response = apiService.getFeaturedProfileById(profileId)
                if (response.isSuccessful && response.body() != null) {
                    emit(Result.Success(response.body()!!))
                } else {
                    emit(Result.Failure(Exception("Failed to load profile detail: ${response.code()}")))
                }
            } catch (e: Exception) {
                emit(Result.Failure(e))
            }
        }

    override suspend fun checkPromotion(
        code: String,
        eventId: String,
        quantity: Int
    ): Result<PromotionResponse> {
        return try {
            val request = ApplyPromotionRequest(code, eventId, quantity)
            val response = apiService.checkPromotion(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Mã giảm giá không hợp lệ hoặc lỗi server."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override fun getPublicPromotions(): Flow<Result<List<Promotion>>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getPublicPromotions()
            if (response.isSuccessful && response.body() != null) {
                val dtos = response.body()!!
                val domainList = dtos.map { it.toDomain() }
                emit(Result.Success(domainList))
            } else {
                emit(Result.Failure(Exception("Failed to load promotions")))
            }
        } catch (e: Exception) {
            emit(Result.Failure(e))
        }
    }

    // Mapper local cho Promotion
    private fun PromotionDto.toDomain(): Promotion {
        return Promotion(
            id = this.id,
            code = this.code,
            discountValue = this.discountValue,
            discountType = this.discountType,
            description = this.description ?: "",
            usageLimit = this.usageLimit,
            usedCount = this.usedCount,
            validFrom = this.validFrom,
            validUntil = this.validUntil,
            minTicketQuantity = this.minTicketQuantity ?: 1,
            isPublic = this.isPublic ?: true,
            eventId = this.eventId
        )
    }

    // --- HELPER: Tính khoảng cách 2 điểm ---
    private fun calculateDistanceKm(
        lat1: Double,
        lon1: Double,
        lat2: Double,
        lon2: Double
    ): Double {
        val r = 6371.0 // Radius of the earth in km
        val dLat = toRadians(lat2 - lat1)
        val dLon = toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(toRadians(lat1)) * cos(toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
    }

    private fun toRadians(deg: Double): Double = deg * (Math.PI / 180)

    private fun parseCoordinates(coordString: String): Pair<Double, Double> {
        return try {
            val parts = coordString.split(",")
            val lat = parts[0].substringAfter("Lat:").trim().toDouble()
            val lon = parts[1].substringAfter("Lon:").trim().toDouble()
            lat to lon
        } catch (e: Exception) {
            0.0 to 0.0
        }
    }
}