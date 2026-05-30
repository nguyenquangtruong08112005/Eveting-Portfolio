package com.tdtuer.eventing_organizer.data.auth

import android.util.Log
import com.facebook.AccessToken
import com.google.firebase.auth.ActionCodeSettings
import com.google.firebase.auth.FacebookAuthProvider
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.tdtuer.eventing_organizer.data.network.AuthApiService
import com.tdtuer.eventing_organizer.data.network.EventApiService
import com.tdtuer.eventing_organizer.data.mapper.toDomainModel
import com.tdtuer.eventing_organizer.data.network.model.LoginRequest
import com.tdtuer.eventing_organizer.data.network.model.RegisterRequest
import com.tdtuer.eventing_organizer.data.network.model.RemoveTokenRequest
import com.tdtuer.eventing_organizer.data.preferences.TokenStore
import com.onesignal.OneSignal
import com.tdtuer.eventing_organizer.domain.model.User
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

class AuthRepositoryImpl @Inject constructor(
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore,
    private val apiService: EventApiService,
    private val authApiService: AuthApiService,
    private val tokenStore: TokenStore
) : AuthRepository {
    override suspend fun signUp(
        name: String,
        email: String,
        password: String,
        role: String
    ): Result<User> {
        try {
            val response = authApiService.register(
                RegisterRequest(name, email, password, role = "organizer")
            )
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null && body.accessToken.isNotBlank() && body.refreshToken.isNotBlank()) {
                    tokenStore.saveTokens(body.accessToken, body.refreshToken, body.tokenType ?: "Bearer")
                    val userDto = body.user
                    return Result.success(
                        User(
                            id = userDto?.id ?: "",
                            name = userDto?.name ?: name,
                            email = userDto?.email ?: email,
                            profilePicUrl = userDto?.profilePicUrl ?: "",
                            role = listOf("organizer"),
                            isOrganizer = true
                        )
                    )
                }
            }
        } catch (_: Exception) {
            // fall through to Firebase fallback
        }
        return try {
            val result = auth.createUserWithEmailAndPassword(email, password).await()
            val uid = result.user?.uid ?: return Result.failure(Exception("Sign up failed"))
            val user = User(id = uid, name = name, email = email, role = listOf(role))
            db.collection("Users").document(uid).set(user).await()
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun signIn(
        email: String,
        password: String
    ): Result<User> {
        try {
            val response = authApiService.login(LoginRequest(email, password))
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null && body.accessToken.isNotBlank() && body.refreshToken.isNotBlank()) {
                    tokenStore.saveTokens(body.accessToken, body.refreshToken, body.tokenType ?: "Bearer")
                    val userDto = body.user
                    val roles = userDto?.roles ?: emptyList()
                    return Result.success(
                        User(
                            id = userDto?.id ?: "",
                            name = userDto?.name ?: "",
                            email = userDto?.email ?: email,
                            profilePicUrl = userDto?.profilePicUrl ?: "",
                            role = roles,
                            isOrganizer = roles.contains("organizer")
                        )
                    )
                }
            }
        } catch (_: Exception) {
            // fall through to Firebase fallback
        }
        return try {
            val result = auth.signInWithEmailAndPassword(email, password).await()
            val uid = result.user?.uid ?: return Result.failure(Exception("Sign in failed"))
            val user = db.collection("Users").document(uid).get().await().toObject(User::class.java)
                ?: return Result.failure(Exception("User not found"))
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun signInWithGoogle(idToken: String): Result<User> {
        return try {
            val credential = GoogleAuthProvider.getCredential(idToken, null)
            val result = auth.signInWithCredential(credential).await()
            val firebaseUser =
                result.user ?: return Result.failure(Exception("Google sign-in failed"))

            val userDoc = db.collection("Users").document(firebaseUser.uid).get().await()
            if (userDoc.exists()) {
                Result.success(userDoc.toObject(User::class.java)!!)
            } else {
                val newUser = User(
                    id = firebaseUser.uid,
                    name = firebaseUser.displayName ?: "Unknown",
                    email = firebaseUser.email ?: "Unknown",
                    profilePicUrl = firebaseUser.photoUrl?.toString() ?: ""
                )
                db.collection("Users").document(firebaseUser.uid).set(newUser).await()
                Result.success(newUser)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun signInWithFacebook(token: AccessToken): Result<User> {
        return try {
            val credential = FacebookAuthProvider.getCredential(token.token)
            val result = auth.signInWithCredential(credential).await()
            val firebaseUser =
                result.user ?: return Result.failure(Exception("Facebook sign-in failed"))

            // Logic kiểm tra và tạo user mới
            val userDoc = db.collection("Users").document(firebaseUser.uid).get().await()
            if (userDoc.exists()) {
                Result.success(userDoc.toObject(User::class.java)!!)
            } else {
                val newUser = User(
                    id = firebaseUser.uid,
                    name = firebaseUser.displayName ?: "Unknown",
                    email = firebaseUser.email ?: "Unknown",
                    profilePicUrl = firebaseUser.photoUrl?.toString() ?: ""
                )
                db.collection("Users").document(firebaseUser.uid).set(newUser).await()
                Result.success(newUser)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override fun getCurrentUser(): Flow<User?> = callbackFlow {
        var jwtUser: User? = null
        try {
            val token = tokenStore.getAccessToken()
            if (!token.isNullOrBlank()) {
                val response = apiService.getUserProfile()
                if (response.isSuccessful) {
                    val dto = response.body()
                    if (dto != null) {
                        jwtUser = dto.toDomainModel()
                    }
                }
            }
        } catch (_: Exception) {
            // fall through to Firebase fallback
        }

        if (jwtUser != null) {
            trySend(jwtUser)
            close()
        } else {
            val authStateListener = FirebaseAuth.AuthStateListener { auth ->
                val uid = auth.currentUser?.uid
                if (uid != null) {
                    db.collection("Users").document(uid).get()
                        .addOnSuccessListener { doc ->
                            trySend(doc.toObject(User::class.java))
                        }
                        .addOnFailureListener {
                            trySend(null)
                        }
                } else {
                    trySend(null)
                }
            }
            auth.addAuthStateListener(authStateListener)
            awaitClose {
                auth.removeAuthStateListener(authStateListener)
            }
        }
    }

    override suspend fun sendEmailVerification(): Result<Unit> {
        return try {
            val user = auth.currentUser

            val actionCodeSettings = ActionCodeSettings.newBuilder()
                .setUrl("https://eventing-baa25.firebaseapp.com")
                .setHandleCodeInApp(true)
                .setAndroidPackageName(
                    "com.tdtuer.eventing_organizer",
                    true,
                    null
                )
                .build()

            user?.sendEmailVerification(actionCodeSettings)?.await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun checkEmailVerificationStatus(): Result<Boolean> {
        return try {
            auth.currentUser?.reload()?.await()
            val isVerified = auth.currentUser?.isEmailVerified ?: false
            Result.success(isVerified)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun applyVerificationCode(code: String): Result<Unit> {
        return try {
            auth.applyActionCode(code).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun signOut() {
        try {
            val token = com.google.firebase.messaging.FirebaseMessaging.getInstance().token.await()
            apiService.removeFcmToken(RemoveTokenRequest(token))
        } catch (e: Exception) {
            e.printStackTrace()
        }
        try {
            OneSignal.logout()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        auth.signOut()
        tokenStore.clearTokens()
    }

    // --> ADDED FOR PASSWORD RESET
    override suspend fun sendPasswordResetEmail(email: String): Result<Unit> {
        return try {
            auth.sendPasswordResetEmail(email).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun verifyPasswordResetCode(code: String): Result<String> {
        return try {
            val email = auth.verifyPasswordResetCode(code).await()
            Result.success(email ?: "")
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun confirmPasswordReset(code: String, newPassword: String): Result<Unit> {
        return try {
            auth.confirmPasswordReset(code, newPassword).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
