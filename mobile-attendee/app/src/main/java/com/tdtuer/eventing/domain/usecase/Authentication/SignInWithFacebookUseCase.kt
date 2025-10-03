package com.tdtuer.eventing.domain.usecase.Authentication

import com.facebook.AccessToken
import com.google.firebase.auth.FacebookAuthProvider
import com.google.firebase.auth.FirebaseAuth
import com.tdtuer.eventing.domain.model.User
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

class SignInWithFacebookUseCase @Inject constructor(private val auth: FirebaseAuth) {
    suspend operator fun invoke(token: AccessToken): Result<User> {
        return try {
            val credential = FacebookAuthProvider.getCredential(token.token)
            val authResult = auth.signInWithCredential(credential).await()
            val firebaseUser = authResult.user
            if (firebaseUser != null) {
                Result.success(User(id = firebaseUser.uid, name = firebaseUser.displayName ?: "", email = firebaseUser.email ?: ""))
            } else {
                Result.failure(Exception("Firebase user is null after successful Facebook sign-in."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
