package com.tdtuer.eventing.data.repository

import com.tdtuer.eventing.data.mapper.toDomainModel
import com.tdtuer.eventing.data.network.EventApiService
import com.tdtuer.eventing.data.network.model.BookTicketRequest
import com.tdtuer.eventing.data.network.model.CreatePaymentOrderRequest
import com.tdtuer.eventing.data.network.model.CreatePaymentOrderResponse
import com.tdtuer.eventing.data.network.model.MediaItemRequest
import com.tdtuer.eventing.data.network.model.PostMediaRequest
import com.tdtuer.eventing.data.network.model.PostReviewRequest
import com.tdtuer.eventing.domain.model.DetailedTicket
import com.tdtuer.eventing.domain.model.Event
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Ticket
import com.tdtuer.eventing.domain.model.failure
import com.tdtuer.eventing.domain.model.success
import com.tdtuer.eventing.ui.screens.postevent.MediaItem
import com.tdtuer.eventing.ui.screens.postevent.ReviewItem

@Singleton
class EventRepositoryImpl @Inject constructor(
    private val apiService: EventApiService
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
        limit: Int
    ): Flow<Result<List<Event>>> = flow {
        try {
            val response = apiService.searchEvents( //
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
                limit = limit
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
}