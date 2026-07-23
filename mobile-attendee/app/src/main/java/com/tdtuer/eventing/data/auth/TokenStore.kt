package com.tdtuer.eventing.data.auth

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenStore @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    private companion object {
        val ACCESS_TOKEN = stringPreferencesKey("backend_access_token")
        val REFRESH_TOKEN = stringPreferencesKey("backend_refresh_token")
    }

    val accessToken: Flow<String?> = dataStore.data.map { it[ACCESS_TOKEN] }
    val refreshToken: Flow<String?> = dataStore.data.map { it[REFRESH_TOKEN] }

    suspend fun getAccessToken(): String? = accessToken.first()
    suspend fun getRefreshToken(): String? = refreshToken.first()

    suspend fun saveTokens(accessToken: String, refreshToken: String) {
        dataStore.edit {
            it[ACCESS_TOKEN] = accessToken
            it[REFRESH_TOKEN] = refreshToken
        }
    }

    suspend fun clearTokens() {
        dataStore.edit {
            it.remove(ACCESS_TOKEN)
            it.remove(REFRESH_TOKEN)
        }
    }
}
