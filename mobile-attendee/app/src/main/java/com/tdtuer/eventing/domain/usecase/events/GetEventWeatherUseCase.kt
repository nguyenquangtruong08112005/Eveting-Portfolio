package com.tdtuer.eventing.domain.usecase.events

import com.tdtuer.eventing.data.repository.EventRepository
import javax.inject.Inject

class GetEventWeatherUseCase @Inject constructor(
    private val repository: EventRepository
) {
    suspend operator fun invoke(eventId: String) = repository.getEventWeather(eventId)
}