package com.tdtuer.eventing.domain.usecase.user

import com.tdtuer.eventing.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Result
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

/**
 * UseCase lấy thông tin chi tiết của một Featured Profile (Organizer/Artist).
 */
class GetFeaturedProfileByIdUseCase @Inject constructor(
    private val repository: EventRepository
) {
    operator fun invoke(profileId: String): Flow<Result<FeaturedProfileDto>> {
        return repository.getFeaturedProfileById(profileId)
    }
}