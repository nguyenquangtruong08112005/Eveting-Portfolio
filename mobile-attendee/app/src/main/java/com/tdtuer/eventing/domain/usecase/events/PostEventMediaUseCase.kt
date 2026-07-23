package com.tdtuer.eventing.domain.usecase.events

import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Result
import javax.inject.Inject

class PostEventMediaUseCase @Inject constructor(
    private val repository: EventRepository
) {
    suspend operator fun invoke(eventId: String, url: String, type: String): Result<Unit> {
        return repository.postEventMedia(eventId, url, type)
    }
}