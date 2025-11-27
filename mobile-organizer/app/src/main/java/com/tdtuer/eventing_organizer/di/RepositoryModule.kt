package com.tdtuer.eventing_organizer.di

import android.content.Context
import com.tdtuer.eventing_organizer.data.auth.AuthRepository
import com.tdtuer.eventing_organizer.data.auth.AuthRepositoryImpl // <-- Đảm bảo import này đúng với vị trí file AuthRepositoryImpl của bạn
import com.tdtuer.eventing_organizer.data.network.EventApiService
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.data.repository.EventRepositoryImpl
import com.tdtuer.eventing_organizer.data.repository.NotificationRepository
import com.tdtuer.eventing_organizer.data.repository.NotificationRepositoryImpl
import com.tdtuer.eventing_organizer.data.repository.TicketRepository
import com.tdtuer.eventing_organizer.data.repository.TicketRepositoryImpl
import com.tdtuer.eventing_organizer.data.repository.UserRepository
import com.tdtuer.eventing_organizer.data.repository.UserRepositoryImpl
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
            apiService: EventApiService,
            @ApplicationContext context: Context // Sửa: Inject thêm context vào đây để dùng cho EventRepositoryImpl nếu cần (hiện tại EventRepositoryImpl đã có constructor nhận context)
        ): EventRepository {
            // EventRepositoryImpl constructor: (apiService, context)
            return EventRepositoryImpl(apiService, context)
        }

        @Provides
        @Singleton
        fun provideTicketRepository(
            @ApplicationContext context: Context, // Sửa: Thêm tham số context được inject từ Hilt
            apiService: EventApiService
        ): TicketRepository {
            return TicketRepositoryImpl(context, apiService)
        }
    }

    @Binds
    @Singleton
    abstract fun bindUserRepository(
        userRepositoryImpl: UserRepositoryImpl
    ): UserRepository

    @Binds
    @Singleton
    abstract fun bindNotificationRepository(
        notificationRepositoryImpl: NotificationRepositoryImpl
    ): NotificationRepository
}