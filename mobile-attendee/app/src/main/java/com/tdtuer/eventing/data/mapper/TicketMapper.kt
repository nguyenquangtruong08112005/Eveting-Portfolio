package com.tdtuer.eventing.data.mapper

import com.tdtuer.eventing.data.network.model.TicketDetailResponse
import com.tdtuer.eventing.domain.model.DetailedTicket

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