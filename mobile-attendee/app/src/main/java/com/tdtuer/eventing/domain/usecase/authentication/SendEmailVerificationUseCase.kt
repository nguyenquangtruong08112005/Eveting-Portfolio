package com.tdtuer.eventing.domain.usecase.authentication

import com.tdtuer.eventing.data.auth.AuthRepository
import javax.inject.Inject

class SendEmailVerificationUseCase @Inject constructor (private val repository: AuthRepository) {
    suspend operator fun invoke() = repository.sendEmailVerification()
}