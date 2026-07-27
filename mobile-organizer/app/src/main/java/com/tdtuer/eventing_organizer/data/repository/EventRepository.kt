package com.tdtuer.eventing_organizer.data.repository

import com.tdtuer.eventing_organizer.data.network.model.AttendeeDto
import com.tdtuer.eventing_organizer.data.network.model.BroadcastResponse
import com.tdtuer.eventing_organizer.data.network.model.ImportAttendeesResponse
import com.tdtuer.eventing_organizer.data.network.model.CheckInResponse
import com.tdtuer.eventing_organizer.data.network.model.CreateEventRequest
import com.tdtuer.eventing_organizer.data.network.model.CreatePromotionRequest
import com.tdtuer.eventing_organizer.data.network.model.DashboardStatsResponse
import com.tdtuer.eventing_organizer.data.network.model.EventStatsResponse
import com.tdtuer.eventing_organizer.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing_organizer.data.network.model.MyEventDto
import com.tdtuer.eventing_organizer.data.network.model.OrganizerProfileResponse
import com.tdtuer.eventing_organizer.data.network.model.PayoutSummaryResponse
import com.tdtuer.eventing_organizer.data.network.model.RegisterOrganizerRequest
import com.tdtuer.eventing_organizer.data.network.model.UpdateOrganizerProfileRequest
import com.tdtuer.eventing_organizer.data.network.model.UpdatePromotionRequest
import com.tdtuer.eventing_organizer.data.network.model.VenueResponse
import com.tdtuer.eventing_organizer.domain.model.Event
import com.tdtuer.eventing_organizer.domain.model.Promotion
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.model.Weather
import com.tdtuer.eventing_organizer.ui.model.MediaItem
import com.tdtuer.eventing_organizer.ui.model.ReviewItem
import kotlinx.coroutines.flow.Flow
import java.io.File

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

    fun getEventMedia(eventId: String): Flow<Result<List<MediaItem>>>

    suspend fun postEventMedia(eventId: String, url: String, type: String): Result<Unit>

    fun getRecommendations(limit: Int = 10): Flow<Result<List<Event>>>
    fun getEventWeather(eventId: String): Flow<Result<Weather>>

    suspend fun registerOrganizer(request: RegisterOrganizerRequest): Result<Unit>
    fun getOrganizerProfile(): Flow<Result<OrganizerProfileResponse>>
    fun getMyEvents(
        status: String? = null,
        page: Int = 1,
        limit: Int = 20
    ): Flow<Result<List<MyEventDto>>>

    fun getDashboardStats(): Flow<Result<DashboardStatsResponse>>
    fun getPayoutSummary(): Flow<Result<PayoutSummaryResponse>>
    suspend fun createEvent(request: CreateEventRequest): Result<Unit>
    suspend fun checkInTicket(qrToken: String): Result<CheckInResponse>

    // Admin Flow
    fun getPendingEvents(): Flow<Result<List<MyEventDto>>>
    suspend fun approveEvent(eventId: String): Result<Unit>
    suspend fun rejectEvent(eventId: String, reason: String): Result<Unit>

    suspend fun updateOrganizerProfile(request: UpdateOrganizerProfileRequest): Result<OrganizerProfileResponse>

    fun getEventAttendees(eventId: String): Flow<Result<List<AttendeeDto>>>

    fun getVenues(): Flow<Result<List<VenueResponse>>>

    fun getFeaturedProfiles(): Flow<Result<List<FeaturedProfileDto>>>
    suspend fun createFeaturedProfile(
        name: String,
        bio: String,
        imageUrl: String?,
        profileType: String,
        genres: List<String>
    ): Result<FeaturedProfileDto>

    fun getEventStats(eventId: String): Flow<Result<EventStatsResponse>>

    suspend fun updateEvent(eventId: String, request: CreateEventRequest): Result<Unit>

    suspend fun importAttendees(eventId: String, file: File): Result<ImportAttendeesResponse>
    suspend fun exportAttendees(eventId: String): Result<String> // Trả về đường dẫn file
    suspend fun broadcastNotification(eventId: String, title: String, message: String): Result<BroadcastResponse>

    // Promotions
    fun getPromotions(): Flow<Result<List<Promotion>>>
    suspend fun createPromotion(request: CreatePromotionRequest): Result<Unit>
    suspend fun updatePromotion(id: String, request: UpdatePromotionRequest): Result<Unit>
    suspend fun deletePromotion(id: String): Result<Unit>
    suspend fun cancelEvent(eventId: String): Result<Unit>
}