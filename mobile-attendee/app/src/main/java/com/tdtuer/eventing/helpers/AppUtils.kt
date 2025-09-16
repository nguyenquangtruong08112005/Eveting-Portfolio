package com.tdtuer.eventing.helpers

import android.util.Patterns
import java.text.NumberFormat
import java.util.*

/**
 * A singleton object providing utility functions for the application.
 * This object contains helper methods for formatting data (like price, date, and time),
 * validating input (like email addresses), and other common tasks.
 */
object AppUtils {

    /**
     * Formats a given price (Double) into a currency string specific to Vietnamese locale (VND).
     * @param price The price to format.
     * @return A string representing the formatted price in VND (e.g., "100.000 ₫").
     */
    fun formatPrice(price: Double): String {
        val format = NumberFormat.getCurrencyInstance(Locale("vi", "VN"))
        return format.format(price)
    }

    /**
     * Formats a given Date object into a date string with the pattern "dd/MM/yyyy".
     * Uses Vietnamese locale for formatting.
     * @param date The Date object to format.
     * @return A string representing the formatted date (e.g., "25/12/2023").
     */
    fun formatDate(date: Date): String {
        val format = java.text.SimpleDateFormat("dd/MM/yyyy", Locale("vi", "VN"))
        return format.format(date)
    }

    /**
     * Formats a given Date object into a time string with the pattern "HH:mm".
     * Uses Vietnamese locale for formatting.
     * @param date The Date object to format.
     * @return A string representing the formatted time (e.g., "14:30").
     */
    fun formatTime(date: Date): String {
        val format = java.text.SimpleDateFormat("HH:mm", Locale("vi", "VN"))
        return format.format(date)
    }

    /**
     * Checks if the given email address is valid.
     * @param email The email address to validate.
     * @return True if the email is valid, false otherwise.
     */
    fun isValidEmail(email: String): Boolean {
        return Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }

    /**
     * Gets a greeting message based on the current time of day.
     * @return A greeting message (e.g., "Good morning", "Good afternoon", "Good evening").
     */
    fun getGreetingMessage(): String {
        val calendar = Calendar.getInstance()
        return when (calendar.get(Calendar.HOUR_OF_DAY)) {
            in 0..11 -> "Good morning"
            in 12..17 -> "Good afternoon"
            else -> "Good evening"
        }
    }

    // TODO: Consider adding utils that require Context or Activity, such as:
    // fun isNetworkAvailable(context: Context): Boolean { ... }
    // fun hideKeyboard(activity: Activity) { ... }
}