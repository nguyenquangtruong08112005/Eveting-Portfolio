package com.tdtuer.eventing_organizer.domain.usecase.authentication

import com.tdtuer.eventing_organizer.data.auth.AuthRepository
import javax.inject.Inject

class SignOutAllDevicesUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(): Result<Unit> = authRepository.signOutAllDevices()
}
