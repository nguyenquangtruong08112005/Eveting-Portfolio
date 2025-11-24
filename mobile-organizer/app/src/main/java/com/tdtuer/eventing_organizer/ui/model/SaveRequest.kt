package com.tdtuer.eventing_organizer.ui.model

data class SaveRequest(
    val qrCodeData: String, // Dữ liệu để tạo 2 mã
    val eventName: String,
    val ticketId: String
)