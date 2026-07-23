package com.tdtuer.eventing_organizer.domain.usecase.authentication

import com.tdtuer.eventing_organizer.data.auth.AuthRepository
import javax.inject.Inject

open class SignInWithGoogleUseCase @Inject constructor(private val repository: AuthRepository){
    suspend operator fun invoke(idToken: String) = repository.signInWithGoogle(idToken)
}