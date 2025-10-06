package com.tdtuer.eventing.domain.usecase.authentication

import com.tdtuer.eventing.data.preferences.UserPreferencesRepository
import javax.inject.Inject

class SetOnboardingCompletedUseCase @Inject constructor(
    private val userPreferencesRepository: UserPreferencesRepository
) {
    suspend operator fun invoke() {
        userPreferencesRepository.setOnboardingCompleted(true)
    }
}
