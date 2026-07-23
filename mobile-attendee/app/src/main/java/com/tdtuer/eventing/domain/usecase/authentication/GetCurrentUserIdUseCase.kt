package com.tdtuer.eventing.domain.usecase.authentication

import com.tdtuer.eventing.data.auth.AuthRepository
import javax.inject.Inject

class GetCurrentUserIdUseCase @Inject constructor(
    private val repository: AuthRepository
) {
    operator fun invoke(): String? {
        return repository.getCurrentUserId()
    }
}