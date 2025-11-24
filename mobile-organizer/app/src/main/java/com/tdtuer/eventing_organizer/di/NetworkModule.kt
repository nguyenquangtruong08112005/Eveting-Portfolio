package com.tdtuer.eventing_organizer.di

import com.google.firebase.auth.FirebaseAuth
import com.google.gson.Gson
import com.tdtuer.eventing_organizer.constants.Constraints.BASE_URL
import com.tdtuer.eventing_organizer.data.network.AddressApiService
import com.tdtuer.eventing_organizer.data.network.EventApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import okhttp3.Interceptor
import okhttp3.OkHttpClient
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
    fun provideOkHttpClient(auth: FirebaseAuth): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val authInterceptor = Interceptor { chain ->
            val token = try {
                runBlocking {
                    auth.currentUser?.getIdToken(false)?.await()?.token
                }
            } catch (e: Exception) {
                null
            }

            val requestBuilder = chain.request().newBuilder()
            
            token?.let {
                requestBuilder.addHeader("Authorization", "Bearer $it")
            }

            chain.proceed(requestBuilder.build())
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
    fun provideAddressApiService(gson: Gson, okHttpClient: OkHttpClient): AddressApiService {
        return Retrofit.Builder()
            .baseUrl("https://provinces.open-api.vn/api/") // Base URL public
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(AddressApiService::class.java)
    }
}
