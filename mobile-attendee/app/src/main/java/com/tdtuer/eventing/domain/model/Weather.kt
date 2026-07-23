package com.tdtuer.eventing.domain.model

data class Weather(
    val temperature: Int, // Làm tròn cho đẹp
    val condition: String,
    val description: String,
    val iconUrl: String
)