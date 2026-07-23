package com.tdtuer.eventing.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.tdtuer.eventing.data.local.entity.EventEntity

@Dao
interface EventDao {
    // Lấy tất cả events
    @Query("SELECT * FROM events")
    suspend fun getAllEvents(): List<EventEntity>

    // Xóa cũ và chèn mới (cho chiến lược refresh toàn bộ)
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(events: List<EventEntity>)

    @Query("DELETE FROM events")
    suspend fun clearAll()

    // Transaction để update cache
    @Transaction
    suspend fun updateCache(events: List<EventEntity>) {
        clearAll()
        insertAll(events)
    }
}