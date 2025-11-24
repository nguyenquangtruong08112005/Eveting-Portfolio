package com.tdtuer.eventing_organizer.data.network.model

import com.google.gson.annotations.SerializedName

data class FeaturedProfileDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("bio") val bio: String?,
    @SerializedName("imageUrl") val imageUrl: String?,
    @SerializedName("job") val job: String? // VD: Singer, Speaker
)

// Response cho list profiles
data class FeaturedProfileListResponse(
    val data: List<FeaturedProfileDto> // Tùy backend trả về list trực tiếp hay bọc trong data
)