package com.tdtuer.eventing.data.network.model

import com.google.gson.annotations.SerializedName

// 1. DTO nhận dữ liệu từ Server (GET /users/me)
data class UserDto(
    @SerializedName("id") val id: String?,
    @SerializedName("email") val email: String?,
    @SerializedName("userName") val userName: String?, // Server trả về userName
    @SerializedName("profilePictureUrl") val profilePicUrl: String?,
    @SerializedName("coverPhotoUrl") val coverPhotoUrl: String?, // Đã có trong response
    @SerializedName("isOrganizer") val isOrganizer: Boolean?,
    @SerializedName("followingCount") val followingCount: Int?,
    @SerializedName("followersCount") val followersCount: Int?,
    @SerializedName("aboutMe") val aboutMe: String?, // Server trả về aboutMe
    @SerializedName("interests") val interests: List<String>?,
    @SerializedName("joinedEvents") val joinedEvents: List<JoinedEventDto>?,
    @SerializedName("birthDate") val birthDate: Long?,
    @SerializedName("address") val address: String?
)

data class JoinedEventDto(
    @SerializedName("id") val id: String?,
    @SerializedName("name") val name: String?,
    @SerializedName("date") val date: Long?,
    @SerializedName("imageUrl") val imageUrl: String?
)

// 2. DTO gửi dữ liệu lên Server (PUT /users/me)
// QUAN TRỌNG: Tên trường @SerializedName phải khớp với log backend bạn muốn
data class UpdateUserRequest(
    @SerializedName("name") val name: String? = null,
    @SerializedName("aboutMe") val aboutMe: String? = null,
    @SerializedName("profilePicUrl") val profilePicUrl: String? = null,
    @SerializedName("coverPhotoUrl") val coverPhotoUrl: String? = null,
    @SerializedName("birthDate") val birthDate: Long? = null,
    @SerializedName("address") val address: String? = null,
    @SerializedName("interests") val interests: List<String>? = null,
    @SerializedName("fcmToken") val fcmToken: String? = null // <-- Đã thêm trường này
)

data class RemoveTokenRequest(
    @SerializedName("fcmToken") val fcmToken: String
)