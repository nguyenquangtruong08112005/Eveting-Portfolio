package com.tdtuer.eventing.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.tdtuer.eventing.data.local.dao.EventDao
import com.tdtuer.eventing.data.local.dao.NotificationDao
import com.tdtuer.eventing.data.local.dao.TicketDao
import com.tdtuer.eventing.data.local.dao.UserDao
import com.tdtuer.eventing.data.local.dao.WeatherDao // [NEW]
import com.tdtuer.eventing.data.local.entity.EventEntity
import com.tdtuer.eventing.data.local.entity.NotificationEntity
import com.tdtuer.eventing.data.local.entity.TicketEntity
import com.tdtuer.eventing.data.local.entity.UserEntity
import com.tdtuer.eventing.data.local.entity.WeatherEntity // [NEW]

@Database(
    entities = [
        EventEntity::class,
        NotificationEntity::class,
        TicketEntity::class,
        UserEntity::class,
        WeatherEntity::class // [NEW] Đăng ký Entity mới
    ],
    version = 5, // [IMPORTANT] Tăng version DB lên 5 (hoặc n+1 so với hiện tại)
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun eventDao(): EventDao
    abstract fun notificationDao(): NotificationDao
    abstract fun ticketDao(): TicketDao
    abstract fun userDao(): UserDao
    abstract fun weatherDao(): WeatherDao // [NEW] Expose DAO mới
}