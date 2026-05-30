package com.tdtuer.eventing_organizer.data.network

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
}
