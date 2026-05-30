package com.tdtuer.eventing_organizer.data.preferences

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
    private object Keys {
        val ACCESS_TOKEN = stringPreferencesKey("access_token")
        val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        val TOKEN_TYPE = stringPreferencesKey("token_type")
    }

    val accessToken: Flow<String?> = dataStore.data.map { it[Keys.ACCESS_TOKEN] }
    val refreshToken: Flow<String?> = dataStore.data.map { it[Keys.REFRESH_TOKEN] }

    suspend fun getAccessToken(): String? {
        return dataStore.data.first()[Keys.ACCESS_TOKEN]
    }

    suspend fun getRefreshToken(): String? {
        return dataStore.data.first()[Keys.REFRESH_TOKEN]
    }

    suspend fun saveTokens(accessToken: String, refreshToken: String, tokenType: String = "Bearer") {
        dataStore.edit {
            it[Keys.ACCESS_TOKEN] = accessToken
            it[Keys.REFRESH_TOKEN] = refreshToken
            it[Keys.TOKEN_TYPE] = tokenType
        }
    }

    suspend fun clearTokens() {
        dataStore.edit {
            it.remove(Keys.ACCESS_TOKEN)
            it.remove(Keys.REFRESH_TOKEN)
            it.remove(Keys.TOKEN_TYPE)
        }
    }
}
