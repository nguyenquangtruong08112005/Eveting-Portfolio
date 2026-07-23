package com.tdtuer.eventing.data.repository

import android.net.Uri
import com.tdtuer.eventing.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing.data.network.model.PromotionResponse
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Promotion
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Weather
import com.tdtuer.eventing.ui.screens.postevent.MediaItem
import com.tdtuer.eventing.ui.screens.postevent.ReviewItem
import kotlinx.coroutines.flow.Flow

interface EventRepository {
    fun getAllEvents(
        page: Int,
        limit: Int,
    ): Flow<Result<List<Event>>>

    fun getEventById(
        eventId: String
    ): Flow<Result<Event>>

    fun findNearbyEvents(
        lat: String,
        lon: String,
        radiusInKm: Double?,
        page: Int,
        limit: Int,
    ): Flow<Result<List<Event>>>

    fun searchEvents(
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
        hasVideo: Boolean? // Đã có tham số này
    ): Flow<Result<List<Event>>>

    fun getEventReviews(eventId: String): Flow<Result<List<ReviewItem>>>

    suspend fun postEventReview(eventId: String, rating: Int, comment: String): Result<Unit>

    fun getFeaturedProfileById(profileId: String): Flow<Result<FeaturedProfileDto>>

    fun getEventMedia(eventId: String): Flow<Result<List<MediaItem>>>

    suspend fun postEventMedia(eventId: String, url: String, type: String): Result<Unit>

    suspend fun uploadEventMediaMultipart(eventId: String, uri: Uri): Result<Unit>

    fun getRecommendations(limit: Int = 10): Flow<Result<List<Event>>>
    fun getEventWeather(eventId: String): Flow<Result<Weather>>

    suspend fun checkPromotion(code: String, eventId: String, quantity: Int): Result<PromotionResponse>

    fun getPublicPromotions(): Flow<Result<List<Promotion>>>
}