package com.tdtuer.eventing.domain.usecase.events

import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.ui.screens.postevent.MediaItem
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetEventMediaUseCase @Inject constructor(
    private val repository: EventRepository
) {
    operator fun invoke(eventId: String): Flow<Result<List<MediaItem>>> {
        return repository.getEventMedia(eventId)
    }
}