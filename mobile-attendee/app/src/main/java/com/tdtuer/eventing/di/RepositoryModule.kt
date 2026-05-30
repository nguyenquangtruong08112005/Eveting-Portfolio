package com.tdtuer.eventing.di

import com.tdtuer.eventing.data.auth.AuthRepository
import com.tdtuer.eventing.data.auth.AuthRepositoryImpl
import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.data.repository.EventRepositoryImpl
import com.tdtuer.eventing.data.repository.LocationRepository
import com.tdtuer.eventing.data.repository.LocationRepositoryImpl
import com.tdtuer.eventing.data.repository.NotificationRepository
import com.tdtuer.eventing.data.repository.NotificationRepositoryImpl
import com.tdtuer.eventing.data.repository.TicketRepository
import com.tdtuer.eventing.data.repository.TicketRepositoryImpl
import com.tdtuer.eventing.data.repository.UserRepository
import com.tdtuer.eventing.data.repository.UserRepositoryImpl
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindAuthRepository(
        authRepositoryImpl: AuthRepositoryImpl
    ): AuthRepository

    // --- SỬA ĐỔI: Dùng @Binds thay vì @Provides ---
    // Hilt sẽ tự động tìm constructor @Inject của EventRepositoryImpl
    // và cung cấp đủ 3 tham số (apiService, eventDao, userPrefs)
    @Binds
    @Singleton
    abstract fun bindEventRepository(
        eventRepositoryImpl: EventRepositoryImpl
    ): EventRepository

    @Binds
    @Singleton
    abstract fun bindTicketRepository(
        ticketRepositoryImpl: TicketRepositoryImpl
    ): TicketRepository
    // -----------------------------------------------

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

    @Binds
    @Singleton
    abstract fun bindLocationRepository(
        locationRepositoryImpl: LocationRepositoryImpl
    ): LocationRepository
}