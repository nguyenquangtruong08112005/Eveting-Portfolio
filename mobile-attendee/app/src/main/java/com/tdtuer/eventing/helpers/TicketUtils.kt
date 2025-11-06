package com.tdtuer.eventing.helpers

import java.text.NumberFormat
import java.util.Locale

fun formatDisplayPrice(minPrice: Double?): String {
    return when {

        minPrice == null -> "Free"

        minPrice > 0 -> {
            val formatter = NumberFormat.getCurrencyInstance(Locale("vi", "VN"))
            "Starts at ${formatter.format(minPrice)}"
        }

        else -> "Free"
    }
}