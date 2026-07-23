package com.tdtuer.eventing.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.tdtuer.eventing.data.local.entity.WeatherEntity

@Dao
interface WeatherDao {
    // Lấy thông tin thời tiết đã cache theo ID sự kiện
    @Query("SELECT * FROM weather_cache WHERE eventId = :eventId")
    suspend fun getWeatherByEventId(eventId: String): WeatherEntity?

    // Lưu hoặc ghi đè thông tin thời tiết
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveWeather(weather: WeatherEntity)

    // Xóa cache cũ hơn một khoảng thời gian (Optional - dùng cho Worker dọn dẹp)
    @Query("DELETE FROM weather_cache WHERE lastUpdated < :timestamp")
    suspend fun deleteOldCache(timestamp: Long)
}