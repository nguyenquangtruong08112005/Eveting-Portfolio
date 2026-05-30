package com.tdtuer.eventing.domain.model

data class UserLocation(
    val latitude: Double,
    val longitude: Double,
    val addressName: String = "" // Optional: Tên địa chỉ (Reverse Geocoding)
)