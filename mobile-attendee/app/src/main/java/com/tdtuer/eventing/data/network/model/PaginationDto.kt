package com.tdtuer.eventing.data.network.model

import com.google.gson.annotations.SerializedName

data class PaginationDto(
    @SerializedName("currentPage")
    val currentPage: Int,

    @SerializedName("limit")
    val limit: Int,

    @SerializedName("totalPages")
    val totalPages: Int,

    @SerializedName("totalItems")
    val totalItems: Int
)