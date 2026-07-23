package com.tdtuer.eventing.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.tdtuer.eventing.data.local.entity.TicketEntity

@Dao
interface TicketDao {
    // Lấy vé của User, sắp xếp theo ngày sự kiện mới nhất
    @Query("SELECT * FROM tickets ORDER BY eventDate ASC")
    suspend fun getUserTickets(): List<TicketEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(tickets: List<TicketEntity>)

    @Query("DELETE FROM tickets")
    suspend fun clearAll()

    @Transaction
    suspend fun updateCache(tickets: List<TicketEntity>) {
        clearAll() // Xóa cache cũ để tránh vé bị hủy vẫn còn
        insertAll(tickets)
    }
}