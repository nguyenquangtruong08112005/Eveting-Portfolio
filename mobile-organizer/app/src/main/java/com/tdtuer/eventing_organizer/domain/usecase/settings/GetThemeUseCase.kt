package com.tdtuer.eventing_organizer.domain.usecase.settings

import com.tdtuer.eventing_organizer.data.preferences.UserPreferencesRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetThemeUseCase @Inject constructor(
    private val userPreferencesRepository: UserPreferencesRepository
) {
    operator fun invoke(): Flow<Boolean?> = userPreferencesRepository.isDarkMode
}