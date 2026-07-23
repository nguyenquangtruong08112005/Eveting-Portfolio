package com.tdtuer.eventing_organizer.data.network.model

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class LoginResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String,
    @SerializedName("tokenType") val tokenType: String? = "Bearer",
    @SerializedName("user") val user: AuthUserDto? = null
)

data class RegisterRequest(
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String,
    @SerializedName("role") val role: String? = null
)

data class RegisterResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String,
    @SerializedName("tokenType") val tokenType: String? = "Bearer",
    @SerializedName("user") val user: AuthUserDto? = null
)

data class RefreshRequest(
    @SerializedName("refreshToken") val refreshToken: String
)

data class RefreshResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String,
    @SerializedName("tokenType") val tokenType: String? = "Bearer"
)

data class AuthUserDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String?,
    @SerializedName("email") val email: String?,
    @SerializedName("profilePicUrl") val profilePicUrl: String? = null,
    @SerializedName("roles") val roles: List<String>? = null
)

data class LogoutRequest(
    @SerializedName("refreshToken") val refreshToken: String
)

data class LogoutResponse(
    @SerializedName("message") val message: String? = null
)

data class GoogleLoginRequest(
    @SerializedName("idToken") val idToken: String,
    @SerializedName("role") val role: String? = null
)

data class FacebookLoginRequest(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("role") val role: String? = null
)

data class PasswordResetRequest(
    @SerializedName("email") val email: String
)

data class PasswordResetConfirmRequest(
    @SerializedName("token") val token: String,
    @SerializedName("newPassword") val newPassword: String
)

data class EmailVerificationRequest(
    @SerializedName("email") val email: String
)

data class EmailVerificationConfirmRequest(
    @SerializedName("token") val token: String
)
