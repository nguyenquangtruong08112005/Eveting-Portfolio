package com.tdtuer.eventing.data.repository

import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import kotlinx.coroutines.flow.Flow

interface EventRepository {
    fun getAllEvents(
        page: Int,
        limit: Int,
    ): Flow<Result<List<Event>>>

    fun searchEvents(

    ): Flow<Result<List<Event>>>
}