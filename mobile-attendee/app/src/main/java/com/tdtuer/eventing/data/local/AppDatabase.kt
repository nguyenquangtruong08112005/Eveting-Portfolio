package com.tdtuer.eventing.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.tdtuer.eventing.data.local.dao.EventDao
import com.tdtuer.eventing.data.local.dao.NotificationDao
import com.tdtuer.eventing.data.local.dao.TicketDao
import com.tdtuer.eventing.data.local.dao.UserDao
import com.tdtuer.eventing.data.local.entity.EventEntity
import com.tdtuer.eventing.data.local.entity.NotificationEntity
import com.tdtuer.eventing.data.local.entity.TicketEntity
import com.tdtuer.eventing.data.local.entity.UserEntity

@Database(
    entities = [
        EventEntity::class,
        NotificationEntity::class,
        TicketEntity::class,
        UserEntity::class // <-- Thêm Entity mới
    ],
    version = 4, // <-- Tăng version
    exportSchema = false
)
@TypeConverters(Converters::class) // <-- Đăng ký Converters
abstract class AppDatabase : RoomDatabase() {
    abstract fun eventDao(): EventDao
    abstract fun notificationDao(): NotificationDao
    abstract fun ticketDao(): TicketDao
    abstract fun userDao(): UserDao // <-- Thêm DAO mới
}