package com.tdtuer.eventing.data.auth

import android.util.Log
import com.facebook.AccessToken
import com.google.firebase.auth.ActionCodeSettings
import com.google.firebase.auth.FacebookAuthProvider
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.tdtuer.eventing.domain.model.User
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

class AuthRepositoryImpl @Inject constructor(
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore
) : AuthRepository {
    override suspend fun signUp(
        name: String,
        email: String,
        password: String,
        role: String
    ): Result<User> {
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
        return try {
            val result = auth.signInWithEmailAndPassword(email, password).await()
            val uid = result.user?.uid ?: return Result.failure(Exception("Sign in failed"))
            val user = db.collection("Users").document(uid).get().await().toObject(User::class.java)
                ?: return Result.failure(Exception("User not found"))
            val idToken = result.user?.getIdToken(false)?.await()?.token
            Log.d("Test", "idToken: $idToken")
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

    override suspend fun sendEmailVerification(): Result<Unit> {
        return try {
            val user = auth.currentUser

            val actionCodeSettings = ActionCodeSettings.newBuilder()
                .setUrl("https://eventing-baa25.firebaseapp.com")
                .setHandleCodeInApp(true)
                .setAndroidPackageName(
                    "com.tdtuer.eventing",
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
        auth.signOut()
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
