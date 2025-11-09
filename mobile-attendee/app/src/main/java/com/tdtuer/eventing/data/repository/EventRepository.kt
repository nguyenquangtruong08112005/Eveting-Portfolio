package com.tdtuer.eventing.data.repository

import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
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
        category: String?,
        date: String?,
        sortBy: String?,
        sortOrder: String?,
        page: Int,
        limit: Int,
    ): Flow<Result<List<Event>>>
}