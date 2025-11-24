package com.tdtuer.eventing_organizer.ui.model

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class LocationResult(
    val lat: Double,
    val lng: Double,
    val address: String,
    val street: String = "",
    val ward: String = "",
    val district: String = "",
    val city: String = ""
) : Parcelable