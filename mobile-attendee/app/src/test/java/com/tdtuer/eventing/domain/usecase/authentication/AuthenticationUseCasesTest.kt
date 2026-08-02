package com.tdtuer.eventing.domain.usecase.authentication

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.mutablePreferencesOf
import com.facebook.AccessToken
import com.facebook.AccessTokenSource
import com.tdtuer.eventing.data.auth.AuthRepository
import com.tdtuer.eventing.data.preferences.UserPreferencesRepository
import com.tdtuer.eventing.domain.model.User
import java.util.Date
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthenticationUseCasesTest {

    // ---------------------------------------------------------------------
    // Fakes
    // ---------------------------------------------------------------------

    private class FakeAuthRepository : AuthRepository {
        var signInResult: Result<User> = Result.success(User())
        var lastSignInEmail: String? = null
        var lastSignInPassword: String? = null

        var signUpResult: Result<User> = Result.success(User())
        var lastSignUpName: String? = null
        var lastSignUpEmail: String? = null
        var lastSignUpPassword: String? = null
        var lastSignUpRole: String? = null

        var signInWithGoogleResult: Result<User> = Result.success(User())
        var lastGoogleIdToken: String? = null

        var signInWithFacebookResult: Result<User> = Result.success(User())
        var lastFacebookToken: AccessToken? = null

        var currentUserFlow: Flow<User?> = emptyFlow()
        var currentUserIdValue: String? = null

        var sendEmailVerificationResult: Result<Unit> = Result.success(Unit)
        var checkEmailVerificationStatusResult: Result<Boolean> = Result.success(false)
        var applyVerificationCodeResult: Result<Unit> = Result.success(Unit)
        var lastVerificationCode: String? = null

        var signOutCount = 0

        var verifyPasswordResetCodeResult: Result<String> = Result.success("")
        var lastVerifyCode: String? = null

        var confirmPasswordResetResult: Result<Unit> = Result.success(Unit)
        var lastConfirmCode: String? = null
        var lastConfirmNewPassword: String? = null

        var sendPasswordResetEmailResult: Result<Unit> = Result.success(Unit)
        var lastResetEmail: String? = null

        override suspend fun signIn(email: String, password: String): Result<User> {
            lastSignInEmail = email
            lastSignInPassword = password
            return signInResult
        }

        override suspend fun signUp(name: String, email: String, password: String, role: String): Result<User> {
            lastSignUpName = name
            lastSignUpEmail = email
            lastSignUpPassword = password
            lastSignUpRole = role
            return signUpResult
        }

        override suspend fun signInWithGoogle(idToken: String): Result<User> {
            lastGoogleIdToken = idToken
            return signInWithGoogleResult
        }

        override suspend fun signInWithFacebook(token: AccessToken): Result<User> {
            lastFacebookToken = token
            return signInWithFacebookResult
        }

        override fun getCurrentUser(): Flow<User?> = currentUserFlow

        override fun getCurrentUserId(): String? = currentUserIdValue

        override suspend fun sendEmailVerification(): Result<Unit> = sendEmailVerificationResult

        override suspend fun checkEmailVerificationStatus(): Result<Boolean> =
            checkEmailVerificationStatusResult

        override suspend fun applyVerificationCode(code: String): Result<Unit> {
            lastVerificationCode = code
            return applyVerificationCodeResult
        }

        override suspend fun signOut() {
            signOutCount++
        }

        override suspend fun verifyPasswordResetCode(code: String): Result<String> {
            lastVerifyCode = code
            return verifyPasswordResetCodeResult
        }

        override suspend fun confirmPasswordReset(code: String, newPassword: String): Result<Unit> {
            lastConfirmCode = code
            lastConfirmNewPassword = newPassword
            return confirmPasswordResetResult
        }

        override suspend fun sendPasswordResetEmail(email: String): Result<Unit> {
            lastResetEmail = email
            return sendPasswordResetEmailResult
        }
    }

    private class FakeDataStore(initial: Preferences = mutablePreferencesOf()) : DataStore<Preferences> {
        private val state = MutableStateFlow(initial)

        override val data: Flow<Preferences> = state.asStateFlow()

        override suspend fun updateData(transform: suspend (t: Preferences) -> Preferences): Preferences {
            val updated = transform(state.value)
            state.value = updated
            return updated
        }
    }

    private val sampleUser = User(id = "u-1", email = "a@b.com", name = "A")
    private val boom = IllegalStateException("boom")
    private val sampleFacebookToken = AccessToken(
        "fb-token-1",
        "app-id",
        "user-1",
        listOf("email"),
        emptyList(),
        emptyList(),
        AccessTokenSource.FACEBOOK_APPLICATION_WEB,
        Date(),
        Date(),
        Date()
    )

    // ---------------------------------------------------------------------
    // SignInUseCase
    // ---------------------------------------------------------------------

    @Test
    fun signIn_forwardsCredentials_andReturnsUser() {
        val repo = FakeAuthRepository()
        repo.signInResult = Result.success(sampleUser)
        val useCase = SignInUseCase(repo)

        val result = runBlocking { useCase("a@b.com", "pass1") }

        assertEquals("a@b.com", repo.lastSignInEmail)
        assertEquals("pass1", repo.lastSignInPassword)
        assertTrue(result.isSuccess)
        assertEquals(sampleUser, result.getOrNull())
    }

    @Test
    fun signIn_propagatesFailure() {
        val repo = FakeAuthRepository()
        repo.signInResult = Result.failure(boom)
        val useCase = SignInUseCase(repo)

        val result = runBlocking { useCase("a@b.com", "pass1") }

        assertTrue(result.isFailure)
        assertSame(boom, result.exceptionOrNull())
    }

    // ---------------------------------------------------------------------
    // SignUpUseCase
    // ---------------------------------------------------------------------

    @Test
    fun signUp_forwardsAllCredentials_andReturnsUser() {
        val repo = FakeAuthRepository()
        repo.signUpResult = Result.success(sampleUser)
        val useCase = SignUpUseCase(repo)

        val result = runBlocking { useCase("A", "a@b.com", "pass1", "attendee") }

        assertEquals("A", repo.lastSignUpName)
        assertEquals("a@b.com", repo.lastSignUpEmail)
        assertEquals("pass1", repo.lastSignUpPassword)
        assertEquals("attendee", repo.lastSignUpRole)
        assertEquals(sampleUser, result.getOrNull())
    }

    @Test
    fun signUp_propagatesFailure() {
        val repo = FakeAuthRepository()
        repo.signUpResult = Result.failure(boom)
        val useCase = SignUpUseCase(repo)

        val result = runBlocking { useCase("A", "a@b.com", "pass1", "attendee") }

        assertTrue(result.isFailure)
        assertSame(boom, result.exceptionOrNull())
    }

    // ---------------------------------------------------------------------
    // SignInWithGoogleUseCase
    // ---------------------------------------------------------------------

    @Test
    fun signInWithGoogle_forwardsIdToken_andReturnsUser() {
        val repo = FakeAuthRepository()
        repo.signInWithGoogleResult = Result.success(sampleUser)
        val useCase = SignInWithGoogleUseCase(repo)

        val result = runBlocking { useCase("google-token") }

        assertEquals("google-token", repo.lastGoogleIdToken)
        assertEquals(sampleUser, result.getOrNull())
    }

    @Test
    fun signInWithGoogle_propagatesFailure() {
        val repo = FakeAuthRepository()
        repo.signInWithGoogleResult = Result.failure(boom)
        val useCase = SignInWithGoogleUseCase(repo)

        val result = runBlocking { useCase("google-token") }

        assertTrue(result.isFailure)
        assertSame(boom, result.exceptionOrNull())
    }

    // ---------------------------------------------------------------------
    // SignInWithFacebookUseCase
    // ---------------------------------------------------------------------

    @Test
    fun signInWithFacebook_forwardsToken_andReturnsUser() {
        val repo = FakeAuthRepository()
        repo.signInWithFacebookResult = Result.success(sampleUser)
        val useCase = SignInWithFacebookUseCase(repo)

        val result = runBlocking { useCase(sampleFacebookToken) }

        assertSame(sampleFacebookToken, repo.lastFacebookToken)
        assertEquals(sampleUser, result.getOrNull())
    }

    @Test
    fun signInWithFacebook_propagatesFailure() {
        val repo = FakeAuthRepository()
        repo.signInWithFacebookResult = Result.failure(boom)
        val useCase = SignInWithFacebookUseCase(repo)

        val result = runBlocking { useCase(sampleFacebookToken) }

        assertTrue(result.isFailure)
        assertSame(boom, result.exceptionOrNull())
    }

    // ---------------------------------------------------------------------
    // GetCurrentUserUseCase
    // ---------------------------------------------------------------------

    @Test
    fun getCurrentUser_returnsUserFlow() {
        val repo = FakeAuthRepository()
        repo.currentUserFlow = flowOf(sampleUser)
        val useCase = GetCurrentUserUseCase(repo)

        val result = runBlocking { useCase().first() }

        assertEquals(sampleUser, result)
    }

    @Test
    fun getCurrentUser_returnsNullWhenSignedOut() {
        val repo = FakeAuthRepository()
        repo.currentUserFlow = flowOf(null)
        val useCase = GetCurrentUserUseCase(repo)

        val result = runBlocking { useCase().first() }

        assertNull(result)
    }

    // ---------------------------------------------------------------------
    // GetCurrentUserIdUseCase
    // ---------------------------------------------------------------------

    @Test
    fun getCurrentUserId_returnsRepositoryId() {
        val repo = FakeAuthRepository()
        repo.currentUserIdValue = "u-1"

        assertEquals("u-1", GetCurrentUserIdUseCase(repo)())
    }

    @Test
    fun getCurrentUserId_returnsNullWhenRepositoryReturnsNull() {
        val repo = FakeAuthRepository()
        repo.currentUserIdValue = null

        assertNull(GetCurrentUserIdUseCase(repo)())
    }

    // ---------------------------------------------------------------------
    // SendEmailVerificationUseCase
    // ---------------------------------------------------------------------

    @Test
    fun sendEmailVerification_returnsSuccess() {
        val repo = FakeAuthRepository()
        repo.sendEmailVerificationResult = Result.success(Unit)

        val result = runBlocking { SendEmailVerificationUseCase(repo)() }

        assertTrue(result.isSuccess)
    }

    @Test
    fun sendEmailVerification_propagatesFailure() {
        val repo = FakeAuthRepository()
        repo.sendEmailVerificationResult = Result.failure(boom)

        val result = runBlocking { SendEmailVerificationUseCase(repo)() }

        assertTrue(result.isFailure)
        assertSame(boom, result.exceptionOrNull())
    }

    // ---------------------------------------------------------------------
    // CheckEmailVerificationStatusUseCase
    // ---------------------------------------------------------------------

    @Test
    fun checkEmailVerificationStatus_returnsRepositoryValue() {
        val repo = FakeAuthRepository()
        repo.checkEmailVerificationStatusResult = Result.success(true)

        val result = runBlocking { CheckEmailVerificationStatusUseCase(repo)() }

        assertEquals(true, result.getOrNull())
    }

    @Test
    fun checkEmailVerificationStatus_propagatesFailure() {
        val repo = FakeAuthRepository()
        repo.checkEmailVerificationStatusResult = Result.failure(boom)

        val result = runBlocking { CheckEmailVerificationStatusUseCase(repo)() }

        assertTrue(result.isFailure)
        assertSame(boom, result.exceptionOrNull())
    }

    // ---------------------------------------------------------------------
    // ApplyVerificationCodeUseCase
    // ---------------------------------------------------------------------

    @Test
    fun applyVerificationCode_forwardsCode_andReturnsSuccess() {
        val repo = FakeAuthRepository()
        repo.applyVerificationCodeResult = Result.success(Unit)
        val useCase = ApplyVerificationCodeUseCase(repo)

        val result = runBlocking { useCase("123456") }

        assertEquals("123456", repo.lastVerificationCode)
        assertTrue(result.isSuccess)
    }

    @Test
    fun applyVerificationCode_propagatesFailure() {
        val repo = FakeAuthRepository()
        repo.applyVerificationCodeResult = Result.failure(boom)
        val useCase = ApplyVerificationCodeUseCase(repo)

        val result = runBlocking { useCase("123456") }

        assertTrue(result.isFailure)
        assertSame(boom, result.exceptionOrNull())
    }

    // ---------------------------------------------------------------------
    // SignOutUseCase
    // ---------------------------------------------------------------------

    @Test
    fun signOut_callsRepositorySignOut() {
        val repo = FakeAuthRepository()

        runBlocking { SignOutUseCase(repo)() }

        assertEquals(1, repo.signOutCount)
    }

    // ---------------------------------------------------------------------
    // VerifyPasswordResetCodeUseCase
    // ---------------------------------------------------------------------

    @Test
    fun verifyPasswordResetCode_forwardsCode_andReturnsEmail() {
        val repo = FakeAuthRepository()
        repo.verifyPasswordResetCodeResult = Result.success("a@b.com")
        val useCase = VerifyPasswordResetCodeUseCase(repo)

        val result = runBlocking { useCase("reset-code") }

        assertEquals("reset-code", repo.lastVerifyCode)
        assertEquals("a@b.com", result.getOrNull())
    }

    @Test
    fun verifyPasswordResetCode_propagatesFailure() {
        val repo = FakeAuthRepository()
        repo.verifyPasswordResetCodeResult = Result.failure(boom)
        val useCase = VerifyPasswordResetCodeUseCase(repo)

        val result = runBlocking { useCase("reset-code") }

        assertTrue(result.isFailure)
        assertSame(boom, result.exceptionOrNull())
    }

    // ---------------------------------------------------------------------
    // ConfirmPasswordResetUseCase
    // ---------------------------------------------------------------------

    @Test
    fun confirmPasswordReset_forwardsCodeAndPassword_andReturnsSuccess() {
        val repo = FakeAuthRepository()
        repo.confirmPasswordResetResult = Result.success(Unit)
        val useCase = ConfirmPasswordResetUseCase(repo)

        val result = runBlocking { useCase("reset-code", "new-pass") }

        assertEquals("reset-code", repo.lastConfirmCode)
        assertEquals("new-pass", repo.lastConfirmNewPassword)
        assertTrue(result.isSuccess)
    }

    @Test
    fun confirmPasswordReset_propagatesFailure() {
        val repo = FakeAuthRepository()
        repo.confirmPasswordResetResult = Result.failure(boom)
        val useCase = ConfirmPasswordResetUseCase(repo)

        val result = runBlocking { useCase("reset-code", "new-pass") }

        assertTrue(result.isFailure)
        assertSame(boom, result.exceptionOrNull())
    }

    // ---------------------------------------------------------------------
    // SendPasswordResetEmailUseCase
    // ---------------------------------------------------------------------

    @Test
    fun sendPasswordResetEmail_forwardsEmail_andReturnsSuccess() {
        val repo = FakeAuthRepository()
        repo.sendPasswordResetEmailResult = Result.success(Unit)
        val useCase = SendPasswordResetEmailUseCase(repo)

        val result = runBlocking { useCase("a@b.com") }

        assertEquals("a@b.com", repo.lastResetEmail)
        assertTrue(result.isSuccess)
    }

    @Test
    fun sendPasswordResetEmail_propagatesFailure() {
        val repo = FakeAuthRepository()
        repo.sendPasswordResetEmailResult = Result.failure(boom)
        val useCase = SendPasswordResetEmailUseCase(repo)

        val result = runBlocking { useCase("a@b.com") }

        assertTrue(result.isFailure)
        assertSame(boom, result.exceptionOrNull())
    }

    // ---------------------------------------------------------------------
    // CheckOnboardingStatusUseCase
    // ---------------------------------------------------------------------

    @Test
    fun checkOnboardingStatus_startsFalse_thenTrueAfterCompletion() {
        val repo = UserPreferencesRepository(FakeDataStore())
        val useCase = CheckOnboardingStatusUseCase(repo)

        assertFalse(runBlocking { useCase().first() })

        runBlocking { SetOnboardingCompletedUseCase(repo)() }

        assertTrue(runBlocking { useCase().first() })
    }

    // ---------------------------------------------------------------------
    // SetOnboardingCompletedUseCase
    // ---------------------------------------------------------------------

    @Test
    fun setOnboardingCompleted_persistsTrue() {
        val repo = UserPreferencesRepository(FakeDataStore())

        runBlocking { SetOnboardingCompletedUseCase(repo)() }

        assertEquals(true, runBlocking { repo.isOnboardingCompleted.first() })
    }

    // ---------------------------------------------------------------------
    // GetRememberMeStatusUseCase / SaveRememberMeStatusUseCase
    // ---------------------------------------------------------------------

    @Test
    fun rememberMeStatus_startsFalse_thenReflectsSavedValue() {
        val repo = UserPreferencesRepository(FakeDataStore())
        val getUseCase = GetRememberMeStatusUseCase(repo)

        assertFalse(runBlocking { getUseCase().first() })

        runBlocking { SaveRememberMeStatusUseCase(repo)(true) }

        assertTrue(runBlocking { getUseCase().first() })
    }

    @Test
    fun saveRememberMeStatus_forwardsValueToRepository() {
        val repo = UserPreferencesRepository(FakeDataStore())
        val useCase = SaveRememberMeStatusUseCase(repo)

        runBlocking { useCase(false) }
        assertEquals(false, runBlocking { repo.isRememberMe.first() })

        runBlocking { useCase(true) }
        assertEquals(true, runBlocking { repo.isRememberMe.first() })
    }
}
