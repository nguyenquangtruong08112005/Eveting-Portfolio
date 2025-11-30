package com.tdtuer.eventing.data.local

import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.tdtuer.eventing.domain.model.JoinedEvent

class Converters {
    private val gson = Gson()

    // 1. Convert List<String> (interests, roles, ids...)
    @TypeConverter
    fun fromStringList(value: List<String>?): String {
        return gson.toJson(value ?: emptyList<String>())
    }

    @TypeConverter
    fun toStringList(value: String): List<String> {
        val listType = object : TypeToken<List<String>>() {}.type
        return try {
            gson.fromJson(value, listType)
        } catch (e: Exception) {
            emptyList()
        }
    }

    // 2. Convert List<JoinedEvent>
    @TypeConverter
    fun fromJoinedEventList(value: List<JoinedEvent>?): String {
        return gson.toJson(value ?: emptyList<JoinedEvent>())
    }

    @TypeConverter
    fun toJoinedEventList(value: String): List<JoinedEvent> {
        val listType = object : TypeToken<List<JoinedEvent>>() {}.type
        return try {
            gson.fromJson(value, listType)
        } catch (e: Exception) {
            emptyList()
        }
    }
}