package com.tdtuer.eventing_organizer.domain.usecase.events

import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Event
import com.tdtuer.eventing_organizer.domain.model.Result
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class FindNearbyEventsUseCase @Inject constructor(
    private val eventRepository: EventRepository
) {
    operator fun invoke(
        lat: String,
        lon: String,
        radiusInKm: Double,
        limit: Int = 10,
        page: Int = 1,
    ): Flow<Result<List<Event>>> {
        return eventRepository.findNearbyEvents(
            lat, lon, radiusInKm,
            page = page,
            limit = limit
        )
    }
}