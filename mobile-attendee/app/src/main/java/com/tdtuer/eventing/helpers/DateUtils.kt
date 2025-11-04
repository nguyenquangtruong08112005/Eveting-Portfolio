package com.tdtuer.eventing.helpers

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

fun formatTimestampToDay(timestamp: Long): String {
    return try {
        val sdf = SimpleDateFormat("dd", Locale.getDefault())
        val netDate = Date(timestamp)
        sdf.format(netDate)
    } catch (e: Exception) {
        "?"
    }
}

fun formatTimestampToMonth(timestamp: Long): String {
    return try {
        val sdf = SimpleDateFormat("MMM", Locale.getDefault())
        val netDate = Date(timestamp)
        sdf.format(netDate).uppercase(Locale.getDefault())
    } catch (e: Exception) {
        "?"
    }
}