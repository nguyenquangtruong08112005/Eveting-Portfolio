package com.tdtuer.eventing_organizer.data.network.model

import com.google.gson.annotations.SerializedName

data class Province(
    @SerializedName("code") val code: Int,
    @SerializedName("name") val name: String,
    @SerializedName("districts") val districts: List<District> = emptyList()
)

data class District(
    @SerializedName("code") val code: Int,
    @SerializedName("name") val name: String,
    @SerializedName("wards") val wards: List<Ward> = emptyList()
)

data class Ward(
    @SerializedName("code") val code: Int,
    @SerializedName("name") val name: String
)