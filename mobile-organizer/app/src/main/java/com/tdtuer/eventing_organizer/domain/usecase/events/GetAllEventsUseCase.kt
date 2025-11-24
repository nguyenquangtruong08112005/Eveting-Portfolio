package com.tdtuer.eventing_organizer.domain.usecase.events

import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Event
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import com.tdtuer.eventing_organizer.domain.model.Result

class GetAllEventsUseCase @Inject constructor(
    private val eventRepository: EventRepository
){
    operator fun invoke(
        page: Int = 1,
        limit: Int = 10
    ): Flow<Result<List<Event>>> {

        return eventRepository.getAllEvents(
            page = page,
            limit = limit
        )
    }
}
