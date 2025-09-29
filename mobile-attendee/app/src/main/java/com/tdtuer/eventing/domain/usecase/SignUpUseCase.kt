package com.tdtuer.eventing.domain.usecase

import com.tdtuer.eventing.data.auth.AuthRepository
import javax.inject.Inject

open class SignUpUseCase @Inject constructor(private val repository:  AuthRepository){
    suspend operator fun invoke(email: String, password: String, role: String) = repository.signUp(email, password, role)
}