package com.tdtuer.eventing.di

import android.content.Context
import com.tdtuer.eventing.data.auth.AuthRepository
import com.tdtuer.eventing.data.auth.AuthRepositoryImpl // <-- Đảm bảo import này đúng với vị trí file AuthRepositoryImpl của bạn
import com.tdtuer.eventing.data.network.EventApiService
import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.data.repository.EventRepositoryImpl
import com.tdtuer.eventing.data.repository.TicketRepository
import com.tdtuer.eventing.data.repository.TicketRepositoryImpl
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class) // Cài đặt module này vào SingletonComponent (phạm vi application)
abstract class RepositoryModule {

    @Binds
    @Singleton // Đảm bảo chỉ có một instance của AuthRepositoryImpl được tạo và sử dụng
    abstract fun bindAuthRepository(
        authRepositoryImpl: AuthRepositoryImpl // Hilt sẽ biết cách tạo AuthRepositoryImpl nếu nó có @Inject constructor
    ): AuthRepository

    companion object {

        @Provides
        @Singleton
        fun provideEventRepository(
            apiService: EventApiService
        ): EventRepository {
            return EventRepositoryImpl(apiService)
        }

        @Provides
        @Singleton
        fun provideTicketRepository(
            @ApplicationContext context: Context,
            apiService: EventApiService
        ): TicketRepository {
            return TicketRepositoryImpl(context, apiService)
        }
    }
}
