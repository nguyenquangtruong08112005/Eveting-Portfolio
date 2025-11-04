package com.tdtuer.eventing.data.repository

import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import kotlinx.coroutines.flow.Flow

interface EventRepository {
    fun getAllEvents(): Flow<Result<List<Event>>>
}