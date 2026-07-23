package com.tdtuer.eventing_organizer.domain.usecase.authentication

import com.tdtuer.eventing_organizer.data.auth.AuthRepository
import com.tdtuer.eventing_organizer.domain.model.User
import javax.inject.Inject

open class SignInUseCase @Inject constructor(private val repository: AuthRepository){
    suspend operator fun invoke(email: String, password: String) : Result<User> {
        return repository.signIn(email, password)
    }
}
