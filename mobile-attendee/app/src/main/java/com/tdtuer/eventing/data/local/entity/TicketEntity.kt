package com.tdtuer.eventing.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.tdtuer.eventing.data.network.model.UserTicketDto
import com.tdtuer.eventing.domain.model.DetailedTicket
import com.tdtuer.eventing.ui.screens.ticket.MyTicketUiModel
import com.tdtuer.eventing.ui.screens.ticket.TicketStatus
import com.tdtuer.eventing.helpers.formatTimestampToDay
import com.tdtuer.eventing.helpers.formatTimestampToHour
import com.tdtuer.eventing.helpers.formatTimestampToMinute
import com.tdtuer.eventing.helpers.formatTimestampToMonth
import com.tdtuer.eventing.helpers.formatTimestampToYear

@Entity(tableName = "tickets")
data class TicketEntity(
    @PrimaryKey val id: String,
    val eventId: String,
    val eventName: String,
    val eventImageUrl: String,
    val eventDate: Long,
    val location: String, // venueName + city
    val ticketType: String,
    val status: String,
    val price: Double,
    val qrCode: String?,
    val seat: String?,
    val purchaseDate: Long,
    val lastFetchedAt: Long = System.currentTimeMillis()
)

// Mapper: DTO -> Entity
fun UserTicketDto.toEntity(): TicketEntity {
    return TicketEntity(
        id = this.id,
        eventId = this.event.id,
        eventName = this.event.name,
        eventImageUrl = this.event.imageUrl ?: "",
        eventDate = this.event.date,
        location = "${this.event.venueName ?: ""}, ${this.event.city ?: ""}",
        ticketType = this.type,
        status = this.status,
        price = this.price,
        qrCode = this.qrCode,
        seat = this.seat,
        purchaseDate = this.purchaseDate
    )
}

// Mapper: Entity -> Domain UI Model
fun TicketEntity.toMyTicketUiModel(): MyTicketUiModel {
    val dateStr = "${formatTimestampToDay(this.eventDate)} ${formatTimestampToMonth(this.eventDate)}, ${formatTimestampToYear(this.eventDate)}"
    val timeStr = "${formatTimestampToHour(this.eventDate)}:${formatTimestampToMinute(this.eventDate)}"

    return MyTicketUiModel(
        ticketId = this.id,
        eventId = this.eventId,
        eventName = this.eventName,
        eventImageUrl = this.eventImageUrl,
        fullDate = dateStr,
        fullTime = timeStr,
        location = this.location,
        ticketType = this.ticketType,
        status = TicketStatus.fromString(this.status),
        price = this.price,
        eventTimestamp = this.eventDate,
        weather = null // Weather sẽ được load riêng từ API/Worker
    )
}

fun TicketEntity.toDetailedTicket(): DetailedTicket {
    // Tách địa điểm nếu có thể (Format: "VenueName, City")
    val parts = this.location.split(",")
    val venueNameStr = parts.firstOrNull() ?: this.location

    return DetailedTicket(
        id = this.id,
        ticketType = this.ticketType,
        price = this.price,
        qrCode = this.qrCode ?: "", // Quan trọng: QR Code lấy từ cache
        purchaseDate = this.purchaseDate,
        status = this.status,
        eventName = this.eventName,
        eventDate = this.eventDate,
        eventBannerUrl = this.eventImageUrl,
        venueName = venueNameStr,
        fullAddress = this.location // Dùng chuỗi location đã gộp làm address
    )
}