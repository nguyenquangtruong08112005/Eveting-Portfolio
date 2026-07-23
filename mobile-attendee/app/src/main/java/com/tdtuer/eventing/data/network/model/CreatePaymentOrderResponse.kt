package com.tdtuer.eventing.data.network.model

import com.google.gson.annotations.SerializedName

data class CreatePaymentOrderResponse(
    @SerializedName("zp_trans_token") // Đảm bảo khớp với JSON
    val zpToken: String,

    @SerializedName("app_trans_id")
    val appTransId: String,

    @SerializedName("return_code")
    val returnCode: Int,

    @SerializedName("return_message")
    val returnMessage: String
)
