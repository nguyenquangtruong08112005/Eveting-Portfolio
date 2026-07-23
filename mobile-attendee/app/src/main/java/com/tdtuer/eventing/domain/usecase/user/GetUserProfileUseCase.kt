package com.tdtuer.eventing.domain.usecase.user

import com.tdtuer.eventing.data.repository.UserRepository
import javax.inject.Inject

class GetUserProfileUseCase @Inject constructor(private val repository: UserRepository) {
    suspend operator fun invoke() = repository.getUserProfile()
}