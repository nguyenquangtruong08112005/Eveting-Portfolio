package com.tdtuer.eventing.domain.usecase.Authentication

import com.tdtuer.eventing.data.auth.AuthRepository
import javax.inject.Inject

open class SignInWithGoogleUseCase @Inject constructor(private val repository: AuthRepository){
    suspend operator fun invoke(idToken: String) = repository.signInWithGoogle(idToken)
}