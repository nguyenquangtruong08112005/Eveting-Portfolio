package com.tdtuer.eventing.di

import com.facebook.core.BuildConfig
import com.google.firebase.auth.FirebaseAuth
import com.google.gson.Gson
import com.tdtuer.eventing.constants.Constraints.BASE_URL
import com.tdtuer.eventing.data.auth.TokenStore
import com.tdtuer.eventing.data.network.EventApiService
import com.tdtuer.eventing.data.network.model.AuthResponse
import com.tdtuer.eventing.data.network.model.RefreshTokenRequest
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    private class RetryMarker

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

        val bareClient = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .build()

        val authInterceptor = Interceptor { chain ->
            var request = chain.request()
            val path = request.url.encodedPath
            val isRetry = request.tag(RetryMarker::class.java) != null

            val skipRefresh = path.endsWith("/auth/refresh") ||
                path.endsWith("/auth/login") ||
                path.endsWith("/auth/register")

            val token = try {
                runBlocking {
                    tokenStore.getAccessToken()
                        ?: auth.currentUser?.getIdToken(false)?.await()?.token
                }
            } catch (e: Exception) {
                null
            }

            token?.let {
                request = request.newBuilder()
                    .header("Authorization", "Bearer $it")
                    .build()
            }

            val response = chain.proceed(request)

            if (response.code == 401 && !skipRefresh && !isRetry) {
                val refreshToken = try {
                    runBlocking { tokenStore.getRefreshToken() }
                } catch (e: Exception) {
                    null
                }

                if (refreshToken != null) {
                    try {
                        val json = gson.toJson(RefreshTokenRequest(refreshToken))
                        val mediaType = "application/json".toMediaType()
                        val body = json.toRequestBody(mediaType)
                        val refreshRequest = okhttp3.Request.Builder()
                            .url("${BASE_URL.trimEnd('/')}/auth/refresh")
                            .post(body)
                            .build()
                        bareClient.newCall(refreshRequest).execute().use { refreshResponse ->
                            if (refreshResponse.isSuccessful) {
                                val bodyString = refreshResponse.body?.string()
                                val authResponse = bodyString?.let {
                                    gson.fromJson(it, AuthResponse::class.java)
                                }

                                if (authResponse != null && authResponse.accessToken != null) {
                                    runBlocking {
                                        tokenStore.saveTokens(
                                            accessToken = authResponse.accessToken,
                                            refreshToken = authResponse.refreshToken ?: refreshToken
                                        )
                                    }

                                    response.close()

                                    val retryRequest = chain.request().newBuilder()
                                        .header("Authorization", "Bearer ${authResponse.accessToken}")
                                        .tag(RetryMarker::class.java, RetryMarker())
                                        .build()
                                    return@Interceptor chain.proceed(retryRequest)
                                }
                            } else {
                                runBlocking { tokenStore.clearTokens() }
                            }
                        }
                    } catch (_: Exception) {
                        // Ignore, return original 401
                    }
                }
            }

            response
        }

        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
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
}
