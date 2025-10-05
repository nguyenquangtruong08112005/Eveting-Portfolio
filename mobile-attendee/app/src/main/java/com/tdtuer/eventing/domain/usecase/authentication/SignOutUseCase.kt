package com.tdtuer.eventing.domain.usecase.authentication

import com.tdtuer.eventing.data.auth.AuthRepository
import javax.inject.Inject

class SignOutUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke() = authRepository.signOut()
}