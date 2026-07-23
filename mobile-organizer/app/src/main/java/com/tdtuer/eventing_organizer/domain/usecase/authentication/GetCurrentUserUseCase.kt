package com.tdtuer.eventing_organizer.domain.usecase.authentication

import com.tdtuer.eventing_organizer.data.auth.AuthRepository
import javax.inject.Inject

class GetCurrentUserUseCase @Inject constructor(private val repository: AuthRepository){
    operator fun invoke() = repository.getCurrentUser()
}