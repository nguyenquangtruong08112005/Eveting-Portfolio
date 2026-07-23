package com.tdtuer.eventing.domain.usecase.authentication

import com.tdtuer.eventing.data.preferences.UserPreferencesRepository
import javax.inject.Inject

class SaveRememberMeStatusUseCase @Inject constructor(
    private val userPreferencesRepository: UserPreferencesRepository
) {
    suspend operator fun invoke(rememberMe: Boolean) {
        userPreferencesRepository.setRememberMe(rememberMe)
    }
}
