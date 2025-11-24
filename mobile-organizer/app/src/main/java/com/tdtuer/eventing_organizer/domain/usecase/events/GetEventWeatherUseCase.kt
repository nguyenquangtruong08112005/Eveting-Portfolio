package com.tdtuer.eventing_organizer.domain.usecase.events

import com.tdtuer.eventing_organizer.data.repository.EventRepository
import javax.inject.Inject

class GetEventWeatherUseCase @Inject constructor(
    private val repository: EventRepository
) {
    suspend operator fun invoke(eventId: String) = repository.getEventWeather(eventId)
}