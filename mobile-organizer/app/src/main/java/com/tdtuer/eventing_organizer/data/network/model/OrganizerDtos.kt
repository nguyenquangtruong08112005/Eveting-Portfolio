package com.tdtuer.eventing_organizer.data.network.model

import com.google.gson.annotations.SerializedName

// --- REQUESTS ---

data class RegisterOrganizerRequest(
    @SerializedName("companyName") val companyName: String,
    @SerializedName("description") val description: String,
    @SerializedName("taxCode") val taxCode: String? = null,
    @SerializedName("website") val website: String? = null
)

data class CreateEventRequest(
    @SerializedName("name") val name: String,
    @SerializedName("eventType") val eventType: String = "physical", // 'physical' or 'online'
    @SerializedName("date") val date: Long,
    @SerializedName("endDate") val endDate: Long? = null, // Optional
    @SerializedName("description") val description: String,

    @SerializedName("bannerUrl") val bannerUrl: String, // Ảnh ngang
    @SerializedName("imageUrl") val imageUrl: String,  // Ảnh dọc (Thumbnail)
    @SerializedName("videoUrl") val videoUrl: String? = null,

    @SerializedName("isOutdoor") val isOutdoor: Boolean = false,
    @SerializedName("ticketTypes") val ticketTypes: Map<String, TicketTypeRequest>,
    @SerializedName("category") val category: List<String> = emptyList(),
    @SerializedName("tags") val tags: List<String> = emptyList(),

    // --- CASE 1: ONLINE ---
    @SerializedName("onlineUrl") val onlineUrl: String? = null,

    // --- CASE 2: PHYSICAL (EXISTING VENUE) ---
    @SerializedName("venueId") val venueId: String? = null,

    // --- CASE 3: PHYSICAL (CUSTOM LOCATION) ---
    @SerializedName("venueName") val venueName: String? = null,
    @SerializedName("location") val location: LocationCoordinates? = null,
    @SerializedName("addressDetails") val addressDetails: AddressDetailsRequest? = null,

    @SerializedName("featuredProfileIds") val featuredProfileIds: List<String>
)

data class LocationCoordinates(
    @SerializedName("latitude") val latitude: Double,
    @SerializedName("longitude") val longitude: Double
)

data class AddressDetailsRequest(
    @SerializedName("street") val street: String,
    @SerializedName("ward") val ward: String,
    @SerializedName("district") val district: String,
    @SerializedName("city") val city: String
)

data class LocationRequest(
    @SerializedName("name") val name: String,
    @SerializedName("address") val address: String,
    @SerializedName("lat") val lat: Double,
    @SerializedName("lng") val lng: Double
)

data class TicketTypeRequest(
    @SerializedName("name") val name: String,
    @SerializedName("price") val price: Double,
    @SerializedName("quantity") val quantity: Int,
    @SerializedName("description") val description: String? = null
)

data class CheckInRequest(
    @SerializedName("qrToken") val qrToken: String
)

// --- RESPONSES ---

data class OrganizerProfileResponse(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("followersCount") val followersCount: Int,
    @SerializedName("rating") val rating: Double,
    @SerializedName("organizerInfo") val organizerInfo: OrganizerInfo?
)

data class OrganizerInfo(
    @SerializedName("companyName") val companyName: String,
    @SerializedName("description") val description: String,
    @SerializedName("taxCode") val taxCode: String?,
    @SerializedName("website") val website: String?
)

data class MyEventsResponse(
    @SerializedName("data") val data: List<MyEventDto>
)

data class PendingEventsResponse(
    @SerializedName("events") val events: List<MyEventDto> = emptyList(),
    @SerializedName("page") val page: Int? = null,
    @SerializedName("limit") val limit: Int? = null,
    @SerializedName("total") val total: Int? = null
)

data class MyEventDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String?,
    @SerializedName("imageUrl") val imageUrl: String?,
    @SerializedName("bannerUrl") val bannerUrl: String?,
    @SerializedName("date") val date: Long,
    @SerializedName("location") val location: LocationDto?,
    @SerializedName("venueName") val venueName: String?,
    @SerializedName("city") val city: String?,
    @SerializedName("status") val status: String,
    @SerializedName("viewCount") val viewCount: Int,
    // Thêm các trường khác nếu cần hiển thị chi tiết khi duyệt
    @SerializedName("minPrice") val minPrice: Double?,
    @SerializedName("organizerId") val organizerId: String?
)

data class DashboardStatsResponse(
    @SerializedName("totalRevenue") val totalRevenue: Double,
    @SerializedName("totalTicketsSold") val totalTicketsSold: Int,
    @SerializedName("totalEvents") val totalEvents: Int,
    @SerializedName("upcomingEvents") val upcomingEvents: Int
)

data class CheckInResponse(
    @SerializedName("valid") val valid: Boolean,
    @SerializedName("message") val message: String,
    @SerializedName("ticketInfo") val ticketInfo: CheckInTicketInfo?
)

data class CheckInTicketInfo(
    @SerializedName("ticketId") val ticketId: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("ticketType") val ticketType: String,
    @SerializedName("seat") val seat: String?,
    @SerializedName("status") val status: String,
    @SerializedName("checkedInAt") val checkedInAt: Long?
)

// 1.7 Update Profile Request
data class UpdateOrganizerProfileRequest(
    @SerializedName("companyName") val companyName: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("website") val website: String? = null,
    @SerializedName("avatarUrl") val avatarUrl: String? = null,
    @SerializedName("taxCode") val taxCode: String? = null
)

// 1.8 Get Attendees Response
data class EventAttendeesResponse(
    @SerializedName("attendees") val attendees: List<AttendeeDto>
)

data class AttendeeDto(
    @SerializedName("ticket") val ticket: AttendeeTicketDto,
    @SerializedName("user") val user: AttendeeUserDto
)

data class AttendeeTicketDto(
    @SerializedName("id") val id: String,
    @SerializedName("type") val type: String,
    @SerializedName("status") val status: String, // paid, checkedIn
    @SerializedName("seat") val seat: String?
)

data class AttendeeUserDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("profilePicUrl") val profilePicUrl: String?
)

// DTO cho danh sách Venue lấy từ API [GET] /venues
data class VenueResponse(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("addressDetails") val addressDetails: AddressDetailsDto?,
    @SerializedName("location") val location: LocationDto?
)

data class EventStatsResponse(
    @SerializedName("eventId") val eventId: String,
    @SerializedName("totalRevenue") val totalRevenue: Double,
    @SerializedName("ticketsSold") val ticketsSold: Map<String, Int>?, // VD: {"VIP": 10, "Standard": 50}
    @SerializedName("checkIns") val checkIns: Int,
    @SerializedName("views") val views: Int,
    @SerializedName("dailySales") val dailySales: Map<String, Int>?,
    @SerializedName("salesOverTime") val salesOverTime: List<TimeSeriesData>?
)

data class TimeSeriesData(
    @SerializedName("timestamp") val timestamp: Long,
    @SerializedName("value") val value: Int
)

// Request Body cho Broadcast
data class BroadcastRequest(
    val title: String,
    val message: String
)

data class ImportAttendeesResponse(
    @SerializedName("successCount") val successCount: Int? = null,
    @SerializedName("failCount") val failCount: Int? = null,
    @SerializedName("errors") val errors: List<ImportErrorDto>? = null
)

data class ImportErrorDto(
    @SerializedName("row") val row: Any? = null,
    @SerializedName("error") val error: String? = null
)

data class BroadcastResponse(
    @SerializedName("success") val success: Boolean? = null,
    @SerializedName("sentTo") val sentTo: Int? = null
)
