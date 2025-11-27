package com.tdtuer.eventing_organizer.domain.usecase.organizer

import com.tdtuer.eventing_organizer.data.network.model.OrganizerProfileResponse
import com.tdtuer.eventing_organizer.data.network.model.UpdateOrganizerProfileRequest
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Result
import javax.inject.Inject

class UpdateOrganizerProfileUseCase @Inject constructor(
    private val repository: EventRepository
) {
    suspend operator fun invoke(request: UpdateOrganizerProfileRequest): Result<OrganizerProfileResponse> {
        return repository.updateOrganizerProfile(request)
    }
}