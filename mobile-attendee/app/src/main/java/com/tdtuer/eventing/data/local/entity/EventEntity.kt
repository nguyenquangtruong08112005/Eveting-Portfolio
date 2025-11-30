package com.tdtuer.eventing.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.tdtuer.eventing.domain.model.Event

@Entity(tableName = "events")
data class EventEntity(
    @PrimaryKey val id: String,
    val name: String,
    val date: Long,
    val location: String,
    val coordinates: String,
    val category: String, // Lưu List dưới dạng chuỗi JSON hoặc phân cách bằng dấu phẩy
    val videoUrl: String,
    val imageUrl: String,
    val bannerUrl: String,
    val city: String,
    val venueName: String,
    val minPrice: Double,
    val lastFetchedAt: Long = System.currentTimeMillis() // Để check thời gian 15p
)

// Extension function để map từ Domain -> Entity
fun Event.toEntity(): EventEntity {
    return EventEntity(
        id = this.id,
        name = this.name,
        date = this.date,
        location = this.location,
        coordinates = this.coordinates,
        category = this.category.joinToString(","), // List -> String
        videoUrl = this.videoUrl,
        imageUrl = this.imageUrl,
        bannerUrl = this.bannerUrl,
        city = this.city,
        venueName = this.venueName,
        minPrice = this.minPrice ?: 0.0
    )
}

// Extension function để map từ Entity -> Domain
fun EventEntity.toDomain(): Event {
    return Event(
        id = this.id,
        name = this.name,
        date = this.date,
        location = this.location,
        coordinates = this.coordinates,
        category = if (this.category.isNotEmpty()) this.category.split(",") else emptyList(),
        videoUrl = this.videoUrl,
        imageUrl = this.imageUrl,
        bannerUrl = this.bannerUrl,
        city = this.city,
        venueName = this.venueName,
        minPrice = this.minPrice
    )
}