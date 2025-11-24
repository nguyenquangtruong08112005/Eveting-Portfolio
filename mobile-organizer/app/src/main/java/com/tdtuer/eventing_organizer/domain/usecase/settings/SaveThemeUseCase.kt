package com.tdtuer.eventing_organizer.domain.usecase.settings

import com.tdtuer.eventing_organizer.data.preferences.UserPreferencesRepository
import javax.inject.Inject

class SaveThemeUseCase @Inject constructor(
    private val userPreferencesRepository: UserPreferencesRepository
) {
    suspend operator fun invoke(isDark: Boolean) {
        userPreferencesRepository.setDarkMode(isDark)
    }
}