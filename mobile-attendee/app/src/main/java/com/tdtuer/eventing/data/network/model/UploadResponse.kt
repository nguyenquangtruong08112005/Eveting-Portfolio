package com.tdtuer.eventing.data.network.model

import com.google.gson.annotations.SerializedName

data class UploadResponse(
    @SerializedName("key")
    val key: String,
    @SerializedName("url")
    val url: String,
    @SerializedName("contentType")
    val contentType: String,
    @SerializedName("originalName")
    val originalName: String,
    @SerializedName("size")
    val size: Long
)
