package com.tdtuer.eventing.data.mapper

import com.tdtuer.eventing.data.network.model.TicketDetailResponse
import com.tdtuer.eventing.domain.model.DetailedTicket
import com.tdtuer.eventing.data.network.model.UserTicketDto
import com.tdtuer.eventing.domain.model.MyTicketUiModel
import com.tdtuer.eventing.domain.model.TicketStatus
import com.tdtuer.eventing.helpers.formatTimestampToDay
import com.tdtuer.eventing.helpers.formatTimestampToHour
import com.tdtuer.eventing.helpers.formatTimestampToMinute
import com.tdtuer.eventing.helpers.formatTimestampToMonth
import com.tdtuer.eventing.helpers.formatTimestampToYear

fun TicketDetailResponse.toDomainModel(): DetailedTicket {
    val address = this.venue.addressDetails
    val fullAddress = "${address.street}, ${address.ward}, ${address.district}, ${address.city}"

    return DetailedTicket(
        id = this.ticket.id,
        ticketType = this.ticket.type,
        price = this.ticket.price,
        qrCode = this.ticket.qrCode,
        purchaseDate = this.ticket.purchaseDate,
        status = this.ticket.status,
        eventName = this.event.name,
        eventDate = this.event.date,
        eventBannerUrl = this.event.bannerUrl,
        venueName = this.venue.name,
        fullAddress = fullAddress
    )
}
fun UserTicketDto.toMyTicketUiModel(): MyTicketUiModel {
    val date = this.event.date
    val dateStr = "${formatTimestampToDay(date)} ${formatTimestampToMonth(date)}, ${formatTimestampToYear(date)}"
    val timeStr = "${formatTimestampToHour(date)}:${formatTimestampToMinute(date)}"

    return MyTicketUiModel(
        ticketId = this.id,
        eventName = this.event.name,
        eventImageUrl = this.event.imageUrl ?: "",
        fullDate = dateStr,
        fullTime = timeStr,
        location = "${this.event.venueName ?: ""}, ${this.event.city ?: ""}",
        ticketType = this.type,
        status = TicketStatus.fromString(this.status),
        price = this.price,
        eventTimestamp = date,
        eventId = event.id, // <-- Map giá trị timestamp
    )
}