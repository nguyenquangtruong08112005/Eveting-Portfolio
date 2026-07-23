package com.tdtuer.eventing_organizer.domain.usecase.organizer

import com.tdtuer.eventing_organizer.data.network.model.OrganizerProfileResponse
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Result
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetOrganizerProfileUseCase @Inject constructor(
    private val repository: EventRepository
) {
    operator fun invoke(): Flow<Result<OrganizerProfileResponse>> {
        return repository.getOrganizerProfile()
    }
}