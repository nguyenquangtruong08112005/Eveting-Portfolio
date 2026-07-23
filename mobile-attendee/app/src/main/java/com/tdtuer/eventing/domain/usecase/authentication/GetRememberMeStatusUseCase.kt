package com.tdtuer.eventing.domain.usecase.authentication

import com.tdtuer.eventing.data.preferences.UserPreferencesRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetRememberMeStatusUseCase @Inject constructor(
    private val userPreferencesRepository: UserPreferencesRepository
) {
    operator fun invoke(): Flow<Boolean> {
        return userPreferencesRepository.isRememberMe
    }
}
