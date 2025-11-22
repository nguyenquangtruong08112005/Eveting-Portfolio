package com.tdtuer.eventing.data.network.model
import com.google.gson.annotations.SerializedName

data class WeatherDto(
    @SerializedName("temperature") val temperature: Double,
    @SerializedName("condition") val condition: String,
    @SerializedName("description") val description: String,
    @SerializedName("iconUrl") val iconUrl: String
)