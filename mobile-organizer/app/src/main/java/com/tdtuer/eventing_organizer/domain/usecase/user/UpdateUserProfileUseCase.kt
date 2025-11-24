package com.tdtuer.eventing_organizer.domain.usecase.user

import com.tdtuer.eventing_organizer.data.network.model.UpdateUserRequest
import com.tdtuer.eventing_organizer.data.repository.UserRepository
import javax.inject.Inject

class UpdateUserProfileUseCase @Inject constructor(private val repository: UserRepository) {
    suspend operator fun invoke(request: UpdateUserRequest) = repository.updateUserProfile(request)
}