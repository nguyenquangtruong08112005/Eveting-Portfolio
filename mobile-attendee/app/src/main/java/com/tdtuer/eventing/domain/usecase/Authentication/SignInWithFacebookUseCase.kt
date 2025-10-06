package com.tdtuer.eventing.domain.usecase.authentication

import com.facebook.AccessToken
import com.tdtuer.eventing.data.auth.AuthRepository
import com.tdtuer.eventing.domain.model.User
import javax.inject.Inject

class SignInWithFacebookUseCase @Inject constructor(private val repository: AuthRepository) {
    suspend operator fun invoke(token: AccessToken): Result<User> = repository.signInWithFacebook(token)
}
