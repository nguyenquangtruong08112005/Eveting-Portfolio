package com.tdtuer.eventing.domain.usecase.authentication

import com.tdtuer.eventing.data.auth.AuthRepository
import javax.inject.Inject

open class SignUpUseCase @Inject constructor(private val repository:  AuthRepository){
    suspend operator fun invoke(name: String, email: String, password: String, role: String) = repository.signUp(name, email, password, role)
}