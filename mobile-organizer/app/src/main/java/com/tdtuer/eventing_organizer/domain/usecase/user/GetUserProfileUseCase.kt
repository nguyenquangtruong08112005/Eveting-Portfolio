package com.tdtuer.eventing_organizer.domain.usecase.user

import com.tdtuer.eventing_organizer.data.repository.UserRepository
import javax.inject.Inject

class GetUserProfileUseCase @Inject constructor(private val repository: UserRepository) {
    suspend operator fun invoke() = repository.getUserProfile()
}