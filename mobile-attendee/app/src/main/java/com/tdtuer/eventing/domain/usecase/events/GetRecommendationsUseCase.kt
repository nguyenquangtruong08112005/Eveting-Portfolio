package com.tdtuer.eventing.domain.usecase.events
import com.tdtuer.eventing.data.repository.EventRepository
import javax.inject.Inject

class GetRecommendationsUseCase @Inject constructor(
    private val repository: EventRepository
) {
    operator fun invoke(limit: Int) = repository.getRecommendations()
}