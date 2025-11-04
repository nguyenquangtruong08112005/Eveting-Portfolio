package com.tdtuer.eventing.domain.usecase.events

import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Event
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import com.tdtuer.eventing.domain.model.Result

class GetAllEventsUseCase @Inject constructor(
    private val eventRepository: EventRepository
){
    operator fun invoke(): Flow<Result<List<Event>>> {
        return eventRepository.getAllEvents()
    }
}