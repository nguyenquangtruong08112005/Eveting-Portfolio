package com.tdtuer.eventing.data.network.model

import com.google.gson.annotations.SerializedName
import com.tdtuer.eventing.domain.model.User

data class AuthRegisterRequest(
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String,
    @SerializedName("role") val role: String? = null
)

data class AuthLoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class RefreshTokenRequest(
    @SerializedName("refreshToken") val refreshToken: String
)

data class AuthUserDto(
    @SerializedName("id") val id: String?,
    @SerializedName("email") val email: String?,
    @SerializedName("name") val name: String?,
    @SerializedName("profilePicUrl") val profilePicUrl: String?,
    @SerializedName("roles") val roles: List<String>?
)

data class AuthResponse(
    @SerializedName("user") val user: AuthUserDto?,
    @SerializedName("accessToken") val accessToken: String?,
    @SerializedName("refreshToken") val refreshToken: String?
)

fun AuthUserDto.toDomainUser(): User {
    val domainRoles = roles?.map { role ->
        when (role) {
            "user" -> "attendee"
            else -> role
        }
    } ?: listOf("attendee")
    return User(
        id = id ?: "",
        email = email ?: "",
        name = name ?: "",
        profilePicUrl = profilePicUrl ?: "",
        isOrganizer = roles?.contains("organizer") ?: false,
        role = domainRoles
    )
}
