package com.tdtuer.eventing.domain.usecase.events

import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetEventByIdUseCase @Inject constructor(
    private val eventRepository: EventRepository
) {
    operator fun invoke(eventId: String): Flow<Result<Event>> {
        return eventRepository.getEventById(eventId)
    }
}