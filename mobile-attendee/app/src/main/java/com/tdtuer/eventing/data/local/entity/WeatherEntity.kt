package com.tdtuer.eventing.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.tdtuer.eventing.domain.model.Weather

@Entity(tableName = "weather_cache")
data class WeatherEntity(
    @PrimaryKey val eventId: String, // Khóa ngoại tham chiếu đến Event
    val temperature: Double,
    val condition: String,
    val description: String,
    val iconUrl: String,
    val lastUpdated: Long // Thời điểm lưu cache để tính TTL (Time To Live)
)

/**
 * Chuyển đổi từ Entity (DB) sang Domain Model (UI).
 * @param eventDate: Tham số này hiện tại không dùng trong Weather model nhưng giữ lại để tương thích nếu cần logic tính toán sau này.
 */
fun WeatherEntity.toDomain(eventDate: Long = 0): Weather {
    return Weather(
        temperature = this.temperature.toInt(),
        condition = this.condition,
        description = this.description,
        iconUrl = this.iconUrl
    )
}

/**
 * Chuyển đổi từ Domain Model sang Entity để lưu vào DB.
 * @param eventId: ID của sự kiện (Vì Weather domain model không chứa ID này).
 */
fun Weather.toEntity(eventId: String): WeatherEntity {
    return WeatherEntity(
        eventId = eventId,
        temperature = this.temperature.toDouble(),
        condition = this.condition,
        description = this.description,
        iconUrl = this.iconUrl,
        lastUpdated = System.currentTimeMillis()
    )
}