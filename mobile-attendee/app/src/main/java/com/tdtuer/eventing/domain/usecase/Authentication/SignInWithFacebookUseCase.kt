// com.tdtuer.eventing.domain.usecase.SignInWithFacebookUseCase.kt
package com.tdtuer.eventing.domain.usecase

import com.facebook.AccessToken
import com.tdtuer.eventing.data.auth.AuthRepository
import javax.inject.Inject

open class SignInWithFacebookUseCase @Inject constructor(private val repository: AuthRepository) {
    suspend operator fun invoke(token: AccessToken) = repository.signInWithFacebook(token)
}