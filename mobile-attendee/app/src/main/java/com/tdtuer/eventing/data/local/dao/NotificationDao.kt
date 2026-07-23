package com.tdtuer.eventing.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.tdtuer.eventing.data.local.entity.NotificationEntity

@Dao
interface NotificationDao {
    @Query("SELECT * FROM notifications ORDER BY createdAt DESC")
    suspend fun getAllNotifications(): List<NotificationEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(notifications: List<NotificationEntity>)

    @Query("DELETE FROM notifications")
    suspend fun clearAll()

    @Query("UPDATE notifications SET isRead = 1 WHERE id = :notificationId")
    suspend fun markAsRead(notificationId: String)

    @Transaction
    suspend fun updateCache(notifications: List<NotificationEntity>) {
        clearAll()
        insertAll(notifications)
    }
}