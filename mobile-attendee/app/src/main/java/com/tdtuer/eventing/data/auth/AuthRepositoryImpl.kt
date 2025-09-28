package com.tdtuer.eventing.data.auth

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidUserException
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
    override suspend fun signUp(email: String, password: String, role: String): Result<User> {
        return try {
            val result = auth.createUserWithEmailAndPassword(email, password).await()
            val uid = result.user?.uid ?: return Result.failure(Exception("Sign uo failed"))
            val user = User(id = uid, email = email, role = role)
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
            Result.success(user)
        }
        catch (e: FirebaseAuthInvalidUserException){
            Result.failure(e)
        }
    }

    override fun getCurrentUser(): Flow<User?> = callbackFlow{
        val listener = auth.addAuthStateListener { auth ->
            val uid = auth.currentUser?.uid
            if (uid != null){
                db.collection("Users").document(uid).get().addOnSuccessListener { doc ->
                    trySend(doc.toObject(User::class.java))
                }
            }
            else {
                trySend(null)
            }
        }
        awaitClose { auth.removeAuthStateListener { listener } }
    }

    override suspend fun signOut() {
        auth.signOut()
    }
}