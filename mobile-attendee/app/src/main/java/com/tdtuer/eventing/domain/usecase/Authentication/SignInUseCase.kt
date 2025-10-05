package com.tdtuer.eventing.domain.usecase.authentication

import com.tdtuer.eventing.data.auth.AuthRepository
import javax.inject.Inject

open class SignInUseCase @Inject constructor(private val repository:  AuthRepository){
    suspend operator fun invoke(email: String, password: String) = repository.signIn( email, password)
}
