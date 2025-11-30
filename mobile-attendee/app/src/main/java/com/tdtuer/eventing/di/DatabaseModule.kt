package com.tdtuer.eventing.di

import android.content.Context
import androidx.room.Room
import com.tdtuer.eventing.data.local.AppDatabase
import com.tdtuer.eventing.data.local.dao.EventDao
import com.tdtuer.eventing.data.local.dao.NotificationDao
import com.tdtuer.eventing.data.local.dao.TicketDao
import com.tdtuer.eventing.data.local.dao.UserDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "eventing_db"
        ).fallbackToDestructiveMigration(true)
            .build()
    }

    @Provides
    fun provideEventDao(database: AppDatabase): EventDao {
        return database.eventDao()
    }

    @Provides
    fun provideNotificationDao(database: AppDatabase): NotificationDao {
        return database.notificationDao()
    }

    @Provides
    fun provideTicketDao(database: AppDatabase): TicketDao {
        return database.ticketDao()
    }

    @Provides
    fun provideUserDao(database: AppDatabase): UserDao {
        return database.userDao()
    }
}