package com.tdtuer.eventing_organizer.di

import com.google.firebase.auth.FirebaseAuth
import com.google.gson.Gson
import com.tdtuer.eventing_organizer.constants.Constraints.BASE_URL
import com.tdtuer.eventing_organizer.data.network.AddressApiService
import com.tdtuer.eventing_organizer.data.network.AuthApiService
import com.tdtuer.eventing_organizer.data.network.EventApiService
import com.tdtuer.eventing_organizer.data.network.model.RefreshRequest
import com.tdtuer.eventing_organizer.data.network.model.RefreshResponse
import com.tdtuer.eventing_organizer.data.preferences.TokenStore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideGson(): Gson {
        return Gson()
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(auth: FirebaseAuth, tokenStore: TokenStore, gson: Gson): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val authInterceptor = Interceptor { chain ->
            val originalRequest = chain.request()

            val backendToken = try {
                runBlocking { tokenStore.getAccessToken() }
            } catch (e: Exception) {
                null
            }

            val token = if (!backendToken.isNullOrBlank()) {
                backendToken
            } else {
                try {
                    runBlocking {
                        auth.currentUser?.getIdToken(false)?.await()?.token
                    }
                } catch (e: Exception) {
                    null
                }
            }

            val requestBuilder = originalRequest.newBuilder()

            token?.let {
                requestBuilder.header("Authorization", "Bearer $it")
            }

            val response = chain.proceed(requestBuilder.build())

            val path = originalRequest.url.encodedPath
            val isAuthRequest = path.endsWith("/auth/refresh") ||
                    path.endsWith("/auth/login") ||
                    path.endsWith("/auth/register")
            val isRetry = originalRequest.tag(TokenRetryTag::class.java) != null

            if (response.code == 401 && !isAuthRequest && !isRetry) {
                val refreshToken = try {
                    runBlocking { tokenStore.getRefreshToken() }
                } catch (e: Exception) {
                    null
                }

                if (!refreshToken.isNullOrBlank()) {
                    val baseUrlWithSlash = if (BASE_URL.endsWith("/")) BASE_URL else "$BASE_URL/"
                    val refreshUrl = "${baseUrlWithSlash}auth/refresh"
                    val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                    val requestBodyJson = gson.toJson(RefreshRequest(refreshToken))
                    val requestBody = requestBodyJson.toRequestBody(mediaType)

                    val refreshRequest = Request.Builder()
                        .url(refreshUrl)
                        .post(requestBody)
                        .build()

                    val bareClient = OkHttpClient()
                    var newAccessToken: String? = null
                    var shouldClear = false

                    try {
                        bareClient.newCall(refreshRequest).execute().use { refreshResponse ->
                            if (refreshResponse.isSuccessful) {
                                val bodyString = refreshResponse.body?.string()
                                if (bodyString != null) {
                                    val refreshResponseObj = gson.fromJson(bodyString, RefreshResponse::class.java)
                                    newAccessToken = refreshResponseObj.accessToken
                                    val newRefreshToken = refreshResponseObj.refreshToken
                                    val newTokenType = refreshResponseObj.tokenType ?: "Bearer"
                                    runBlocking {
                                        tokenStore.saveTokens(newAccessToken!!, newRefreshToken, newTokenType)
                                    }
                                }
                            } else {
                                if (refreshResponse.code in 400..499) {
                                    shouldClear = true
                                }
                            }
                        }
                    } catch (e: Exception) {
                        // Network error or timeout, do not clear
                    }

                    if (newAccessToken != null) {
                        response.close()
                        val newRequest = originalRequest.newBuilder()
                            .tag(TokenRetryTag::class.java, TokenRetryTag())
                            .header("Authorization", "Bearer $newAccessToken")
                            .build()
                        return@Interceptor chain.proceed(newRequest)
                    } else {
                        if (shouldClear) {
                            try {
                                runBlocking { tokenStore.clearTokens() }
                            } catch (e: Exception) {
                                // ignore
                            }
                        }
                    }
                }
            }

            response
        }

        return OkHttpClient.Builder()
//            .addInterceptor(loggingInterceptor)
            .addInterceptor(authInterceptor)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(gson: Gson, okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    @Provides
    @Singleton
    fun provideEventApiService(retrofit: Retrofit): EventApiService {
        return retrofit.create(EventApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideAuthApiService(retrofit: Retrofit): AuthApiService {
        return retrofit.create(AuthApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideAddressApiService(gson: Gson, okHttpClient: OkHttpClient): AddressApiService {
        // API Địa chính dùng base URL khác, nên cần tạo Retrofit riêng hoặc override
        return Retrofit.Builder()
            .baseUrl("https://provinces.open-api.vn/api/") // Base URL của API hành chính
            .client(okHttpClient) // Có thể dùng chung client hoặc tạo mới nếu không cần Auth
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(AddressApiService::class.java)
    }
}

private class TokenRetryTag
