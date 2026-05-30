package com.tdtuer.eventing.domain.usecase.user

import com.tdtuer.eventing.data.repository.UserRepository
import com.tdtuer.eventing.domain.model.Result
import javax.inject.Inject

/**
 * UseCase để theo dõi một người dùng/organizer.
 */
class FollowProfileUseCase @Inject constructor(
    private val repository: UserRepository
) {
    suspend operator fun invoke(profileId: String): Result<Unit> {
        return repository.followProfile(profileId)
    }
}