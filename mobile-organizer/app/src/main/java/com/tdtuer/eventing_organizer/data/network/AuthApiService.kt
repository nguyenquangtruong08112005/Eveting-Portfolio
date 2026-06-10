package com.tdtuer.eventing_organizer.data.network

import com.tdtuer.eventing_organizer.data.network.model.GoogleLoginRequest
import com.tdtuer.eventing_organizer.data.network.model.FacebookLoginRequest
import com.tdtuer.eventing_organizer.data.network.model.PasswordResetRequest
import com.tdtuer.eventing_organizer.data.network.model.PasswordResetConfirmRequest
import com.tdtuer.eventing_organizer.data.network.model.EmailVerificationRequest
import com.tdtuer.eventing_organizer.data.network.model.EmailVerificationConfirmRequest
import com.tdtuer.eventing_organizer.data.network.model.LoginRequest
import com.tdtuer.eventing_organizer.data.network.model.LoginResponse
import com.tdtuer.eventing_organizer.data.network.model.LogoutRequest
import com.tdtuer.eventing_organizer.data.network.model.LogoutResponse
import com.tdtuer.eventing_organizer.data.network.model.RefreshRequest
import com.tdtuer.eventing_organizer.data.network.model.RefreshResponse
import com.tdtuer.eventing_organizer.data.network.model.RegisterRequest
import com.tdtuer.eventing_organizer.data.network.model.RegisterResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApiService {

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<RegisterResponse>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>



    @POST("auth/refresh")
    suspend fun refresh(@Body request: RefreshRequest): Response<RefreshResponse>

    @POST("auth/logout")
    suspend fun logout(@Body request: LogoutRequest): Response<LogoutResponse>

    @POST("auth/logout-all")
    suspend fun logoutAll(): Response<LogoutResponse>

    @POST("auth/google-login")
    suspend fun googleLogin(@Body request: GoogleLoginRequest): Response<LoginResponse>

    @POST("auth/facebook-login")
    suspend fun facebookLogin(@Body request: FacebookLoginRequest): Response<LoginResponse>

    @POST("auth/password-reset/request")
    suspend fun requestPasswordReset(@Body request: PasswordResetRequest): Response<Unit>

    @POST("auth/password-reset/confirm")
    suspend fun confirmPasswordReset(@Body request: PasswordResetConfirmRequest): Response<Unit>

    @POST("auth/email-verification/request")
    suspend fun requestEmailVerification(@Body request: EmailVerificationRequest): Response<Unit>

    @POST("auth/email-verification/confirm")
    suspend fun confirmEmailVerification(@Body request: EmailVerificationConfirmRequest): Response<Unit>
}
