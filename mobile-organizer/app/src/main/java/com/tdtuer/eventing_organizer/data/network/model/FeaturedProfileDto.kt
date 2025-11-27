package com.tdtuer.eventing_organizer.data.network.model

import com.google.gson.annotations.SerializedName

data class FeaturedProfileDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("bio") val bio: String?,
    @SerializedName("imageUrl") val imageUrl: String?,
    @SerializedName("profileType") val profileType: String?, // 'artist', 'speaker'...
    @SerializedName("followerCount") val followerCount: Int?,
    @SerializedName("genres") val genres: List<String>? = emptyList() // <-- MỚI
)

data class FeaturedProfileListResponse(
    @SerializedName("profiles") val profiles: List<FeaturedProfileDto>,
    @SerializedName("pagination") val pagination: PaginationDto?
)

data class CreateProfileRequest(
    val name: String,
    val bio: String? = null,
    val imageUrl: String? = null,
    val profileType: String = "artist",
    val genres: List<String> = emptyList() // <-- MỚI
)