package com.tdtuer.eventing.domain.usecase.settings

import com.tdtuer.eventing.data.preferences.UserPreferencesRepository
import javax.inject.Inject

class SaveThemeUseCase @Inject constructor(
    private val userPreferencesRepository: UserPreferencesRepository
) {
    suspend operator fun invoke(isDark: Boolean) {
        userPreferencesRepository.setDarkMode(isDark)
    }
}