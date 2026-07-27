package com.tdtuer.eventing.data.network.model

import com.google.gson.annotations.SerializedName

data class CheckPaymentStatusResponse(
    @SerializedName("status")
    val status: String,

    @SerializedName("message")
    val message: String? = null
)
