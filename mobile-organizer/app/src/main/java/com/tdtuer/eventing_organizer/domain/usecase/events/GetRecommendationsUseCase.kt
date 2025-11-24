package com.tdtuer.eventing_organizer.domain.usecase.events
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import javax.inject.Inject

class GetRecommendationsUseCase @Inject constructor(
    private val repository: EventRepository
) {
    operator fun invoke(limit: Int) = repository.getRecommendations()
}