package com.tdtuer.eventing.data.repository

import com.tdtuer.eventing.data.network.model.CreatePaymentOrderResponse
import com.tdtuer.eventing.domain.model.DetailedTicket
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Ticket
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
        limit: Int
    ): Flow<Result<List<Event>>>

    fun getEventReviews(eventId: String): Flow<Result<List<ReviewItem>>>
    suspend fun postEventReview(eventId: String, rating: Int, comment: String): Result<Unit>
    fun getEventMedia(eventId: String): Flow<Result<List<MediaItem>>>
    suspend fun postEventMedia(eventId: String, url: String, type: String): Result<Unit>
}