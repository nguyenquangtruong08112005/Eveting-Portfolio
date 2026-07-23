package com.tdtuer.eventing.data.preferences

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class UserPreferencesRepository @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    private object PreferencesKeys {
        val IS_ONBOARDING_COMPLETED = booleanPreferencesKey("is_onboarding_completed")
        val REMEMBER_ME = booleanPreferencesKey("remember_me")
        val IS_DARK_MODE = booleanPreferencesKey("is_dark_mode")
        val LAST_EVENT_FETCH_TIME = longPreferencesKey("last_event_fetch_time")
    }

    val isOnboardingCompleted: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[PreferencesKeys.IS_ONBOARDING_COMPLETED] ?: false
        }

    val isRememberMe: Flow<Boolean> = dataStore.data
        .map { preferences ->
            preferences[PreferencesKeys.REMEMBER_ME] ?: false
        }

    val isDarkMode: Flow<Boolean?> = dataStore.data
        .map { preferences -> preferences[PreferencesKeys.IS_DARK_MODE] }

    // Lấy thời gian fetch cuối cùng
    val lastEventFetchTime: Flow<Long> = dataStore.data
        .map { preferences -> preferences[PreferencesKeys.LAST_EVENT_FETCH_TIME] ?: 0L }

    suspend fun setOnboardingCompleted(completed: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.IS_ONBOARDING_COMPLETED] = completed
        }
    }

    suspend fun setRememberMe(rememberMe: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.REMEMBER_ME] = rememberMe
        }
    }

    suspend fun setDarkMode(isDark: Boolean) {
        dataStore.edit { it[PreferencesKeys.IS_DARK_MODE] = isDark }
    }

    suspend fun setLastEventFetchTime(timestamp: Long) {
        dataStore.edit { it[PreferencesKeys.LAST_EVENT_FETCH_TIME] = timestamp }
    }
}