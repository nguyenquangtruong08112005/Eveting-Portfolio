package com.tdtuer.eventing_organizer.domain.usecase.authentication

import com.tdtuer.eventing_organizer.data.preferences.UserPreferencesRepository
import javax.inject.Inject

class SaveRememberMeStatusUseCase @Inject constructor(
    private val userPreferencesRepository: UserPreferencesRepository
) {
    suspend operator fun invoke(rememberMe: Boolean) {
        userPreferencesRepository.setRememberMe(rememberMe)
    }
}
