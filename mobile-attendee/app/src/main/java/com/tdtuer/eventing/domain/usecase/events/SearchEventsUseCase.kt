package com.tdtuer.eventing.domain.usecase.events

import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class SearchEventsUseCase @Inject constructor(
    private val eventRepository: EventRepository
) {
    operator fun invoke(
        category: String?,
        date: String?,
        sortBy: String?,
        sortOrder: String?,
        page: Int,
        limit: Int
    ): Flow<Result<List<Event>>> {
        return eventRepository.searchEvents(category, date, sortBy, sortOrder, page, limit)
    }
}