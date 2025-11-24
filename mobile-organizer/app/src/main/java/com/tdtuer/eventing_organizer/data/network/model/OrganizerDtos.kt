package com.tdtuer.eventing_organizer.data.network.model

import com.google.gson.annotations.SerializedName

// --- REQUESTS ---

data class RegisterOrganizerRequest(
    val companyName: String,
    val description: String,
    val taxCode: String? = null,
    val website: String? = null
)

data class CreateEventRequest(
    val name: String,
    val eventType: String = "physical", // 'physical' or 'online'
    val date: Long,
    val endDate: Long? = null, // Optional
    val description: String,

    val bannerUrl: String, // Ảnh ngang
    val imageUrl: String,  // Ảnh dọc (Thumbnail)
    val videoUrl: String? = null,

    val isOutdoor: Boolean = false,
    val ticketTypes: List<TicketTypeRequest>,
    val category: List<String> = emptyList(),
    val tags: List<String> = emptyList(),

    // --- CASE 1: ONLINE ---
    val onlineUrl: String? = null,

    // --- CASE 2: PHYSICAL (EXISTING VENUE) ---
    val venueId: String? = null,

    // --- CASE 3: PHYSICAL (CUSTOM LOCATION) ---
    val venueName: String? = null,
    val location: LocationCoordinates? = null,
    val addressDetails: AddressDetailsRequest? = null
)
data class LocationCoordinates(
    val latitude: Double,
    val longitude: Double
)

data class AddressDetailsRequest(
    val street: String,
    val ward: String,
    val district: String,
    val city: String
)

data class LocationRequest(
    val name: String,
    val address: String,
    val lat: Double,
    val lng: Double
)

data class TicketTypeRequest(
    val name: String,
    val price: Double,
    val quantity: Int,
    val description: String? = null
)

data class CheckInRequest(
    val qrToken: String
)

// --- RESPONSES ---

data class OrganizerProfileResponse(
    val id: String,
    val name: String,
    val avatarUrl: String?,
    val followersCount: Int,
    val rating: Double,
    val organizerInfo: OrganizerInfo?
)

data class OrganizerInfo(
    val companyName: String,
    val description: String,
    val taxCode: String?
)

data class MyEventsResponse(
    val data: List<MyEventDto>
)

data class MyEventDto(
    val id: String,
    val name: String,
    val date: Long,
    val bannerUrl: String?,
    val status: String, // pending, active, rejected...
    val viewCount: Int
)

data class DashboardStatsResponse(
    val totalRevenue: Double,
    val totalTicketsSold: Int,
    val totalEvents: Int,
    val upcomingEvents: Int
)

data class CheckInResponse(
    val valid: Boolean,
    val message: String,
    val ticketInfo: CheckInTicketInfo?
)

data class CheckInTicketInfo(
    val ticketId: String,
    val userId: String,
    val ticketType: String,
    val seat: String?,
    val status: String,
    val checkedInAt: Long?
)

// 1.7 Update Profile Request
data class UpdateOrganizerProfileRequest(
    val companyName: String? = null,
    val description: String? = null,
    val website: String? = null,
    val avatarUrl: String? = null
)

// 1.8 Get Attendees Response
data class EventAttendeesResponse(
    val attendees: List<AttendeeDto>
)

data class AttendeeDto(
    val ticket: AttendeeTicketDto,
    val user: AttendeeUserDto
)

data class AttendeeTicketDto(
    val id: String,
    val type: String,
    val status: String, // paid, checkedIn
    val seat: String?
)

data class AttendeeUserDto(
    val id: String,
    val name: String,
    val email: String,
    val profilePicUrl: String?
)

// DTO cho danh sách Venue lấy từ API [GET] /venues
data class VenueResponse(
    val id: String,
    val name: String,
    val addressDetails: AddressDetailsDto?,
    val location: LocationDto?
)