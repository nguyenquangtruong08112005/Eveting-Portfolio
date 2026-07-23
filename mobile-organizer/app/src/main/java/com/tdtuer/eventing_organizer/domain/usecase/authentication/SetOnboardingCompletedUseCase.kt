package com.tdtuer.eventing_organizer.domain.usecase.authentication

import com.tdtuer.eventing_organizer.data.preferences.UserPreferencesRepository
import javax.inject.Inject

class SetOnboardingCompletedUseCase @Inject constructor(
    private val userPreferencesRepository: UserPreferencesRepository
) {
    suspend operator fun invoke() {
        userPreferencesRepository.setOnboardingCompleted(true)
    }
}
