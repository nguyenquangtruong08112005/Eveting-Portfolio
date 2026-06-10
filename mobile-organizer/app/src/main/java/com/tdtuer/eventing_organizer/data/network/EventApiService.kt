package com.tdtuer.eventing_organizer.data.network

import com.tdtuer.eventing_organizer.data.network.model.BookTicketRequest
import com.tdtuer.eventing_organizer.data.network.model.BroadcastRequest
import com.tdtuer.eventing_organizer.data.network.model.BroadcastResponse
import com.tdtuer.eventing_organizer.data.network.model.ImportAttendeesResponse
import com.tdtuer.eventing_organizer.data.network.model.CheckInRequest
import com.tdtuer.eventing_organizer.data.network.model.CheckInResponse
import com.tdtuer.eventing_organizer.data.network.model.CreateEventRequest
import com.tdtuer.eventing_organizer.data.network.model.CreatePaymentOrderRequest
import com.tdtuer.eventing_organizer.data.network.model.CreatePaymentOrderResponse
import com.tdtuer.eventing_organizer.data.network.model.CreateProfileRequest
import com.tdtuer.eventing_organizer.data.network.model.CreatePromotionRequest
import com.tdtuer.eventing_organizer.data.network.model.DashboardStatsResponse
import com.tdtuer.eventing_organizer.data.network.model.EventAttendeesResponse
import com.tdtuer.eventing_organizer.data.network.model.EventDetailDto
import com.tdtuer.eventing_organizer.data.network.model.EventDto
import com.tdtuer.eventing_organizer.data.network.model.EventListResponse
import com.tdtuer.eventing_organizer.data.network.model.EventStatsResponse
import com.tdtuer.eventing_organizer.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing_organizer.data.network.model.FeaturedProfileListResponse
import com.tdtuer.eventing_organizer.data.network.model.MediaResponse
import com.tdtuer.eventing_organizer.data.network.model.MyEventDto
import com.tdtuer.eventing_organizer.data.network.model.MyEventsResponse
import com.tdtuer.eventing_organizer.data.network.model.NotificationDto
import com.tdtuer.eventing_organizer.data.network.model.OrganizerProfileResponse
import com.tdtuer.eventing_organizer.data.network.model.PostMediaRequest
import com.tdtuer.eventing_organizer.data.network.model.PostReviewRequest
import com.tdtuer.eventing_organizer.data.network.model.PromotionDto
import com.tdtuer.eventing_organizer.data.network.model.RegisterOrganizerRequest
import com.tdtuer.eventing_organizer.data.network.model.RemoveTokenRequest
import com.tdtuer.eventing_organizer.data.network.model.ReviewResponse
import com.tdtuer.eventing_organizer.data.network.model.TicketDetailResponse
import com.tdtuer.eventing_organizer.data.network.model.UpdateOrganizerProfileRequest
import com.tdtuer.eventing_organizer.data.network.model.UpdatePromotionRequest
import com.tdtuer.eventing_organizer.data.network.model.UpdateUserRequest
import com.tdtuer.eventing_organizer.data.network.model.UserDto
import com.tdtuer.eventing_organizer.data.network.model.UserTicketResponse
import com.tdtuer.eventing_organizer.data.network.model.VenueResponse
import com.tdtuer.eventing_organizer.data.network.model.UploadResponse
import com.tdtuer.eventing_organizer.data.network.model.WeatherDto
import com.tdtuer.eventing_organizer.domain.model.Ticket
import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface EventApiService {

    @GET("events")
    suspend fun getAllEvents(
        @Query("page") page: Int,
        @Query("limit") limit: Int
    ): Response<EventListResponse>

    @GET("events/{id}")
    suspend fun getEventById(
        @Path("id") eventId: String
    ): Response<EventDetailDto>

    @GET("events/nearby")
    suspend fun findNearbyEvents(
        @Query("lat") lat: String,
        @Query("lon") lon: String,
        @Query("radius") radiusInKm: Double?,
        @Query("page") page: Int,
        @Query("limit") limit: Int,
    ): Response<EventListResponse>

    @GET("events/search")
    suspend fun searchEvents(
        // --- CÁC THAM SỐ MỚI TỪ API ---
        @Query("q") query: String?,           // 1. Full-text search (tên sự kiện, nghệ sĩ, v.v.)
        @Query("location") location: String?, // 2. Lọc theo thành phố
        @Query("category") category: String?, // 3. Lọc theo 1 thể loại
        @Query("date") datePreset: String?, // 4. Lọc nhanh (today, tomorrow, v.v.)
        @Query("startDate") startDate: Long?, // 5. Lọc theo ngày bắt đầu (timestamp)
        @Query("endDate") endDate: Long?,   // 6. Lọc theo ngày kết thúc (timestamp)
        @Query("minPrice") minPrice: Double?, // 7. Lọc giá thấp nhất
        @Query("maxPrice") maxPrice: Double?, // 8. Lọc giá cao nhất

        // --- Sắp xếp & Phân trang ---
        @Query("sortBy") sortBy: String?,
        @Query("sortOrder") sortOrder: String?,
        @Query("hasVideo") hasVideo: Boolean?,
        @Query("page") page: Int,
        @Query("limit") limit: Int,
    ): Response<EventListResponse>

    @POST("tickets/book")
    suspend fun bookTicket(
        @Body request: BookTicketRequest
    ): Response<Ticket>

    @POST("payments/create-order")
    suspend fun createZaloPayOrder(
        @Body request: CreatePaymentOrderRequest
    ): Response<CreatePaymentOrderResponse>

    @GET("tickets/{ticketId}")
    suspend fun getTicketDetails(
        @Path("ticketId") ticketId: String
    ): Response<TicketDetailResponse>

    @GET("users/me/tickets")
    suspend fun getUserTickets(
        @Query("page") page: Int,
        @Query("limit") limit: Int
    ): Response<UserTicketResponse>

    // Lấy thông tin profile cá nhân
    @GET("users/me")
    suspend fun getUserProfile(): Response<UserDto>

    // Cập nhật thông tin profile
    @PUT("users/me")
    suspend fun updateUserProfile(@Body request: UpdateUserRequest): Response<UserDto>

    // --- REVIEW API ---
    @GET("events/{eventId}/reviews")
    suspend fun getEventReviews(
        @Path("eventId") eventId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ReviewResponse> // Trả về Wrapper có chứa list

    @POST("events/{eventId}/reviews")
    suspend fun postEventReview(
        @Path("eventId") eventId: String,
        @Body request: PostReviewRequest
    ): Response<Unit> // Hoặc Response<ReviewDto> nếu server trả về review vừa tạo

    // --- MEDIA API ---
    @GET("events/{eventId}/media")
    suspend fun getEventMedia(
        @Path("eventId") eventId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<MediaResponse> // Trả về Wrapper

    @POST("events/{eventId}/media")
    suspend fun postEventMedia(
        @Path("eventId") eventId: String,
        @Body request: PostMediaRequest // Gửi dạng Object chứa mảng mediaItems
    ): Response<Unit>

    @GET("events/recommendations")
    suspend fun getRecommendations(
        @Query("limit") limit: Int = 10
    ): Response<List<EventDto>>

    @GET("events/{id}/weather")
    suspend fun getWeather(@Path("id") eventId: String): Response<WeatherDto> // Cần tạo DTO này

    // 1. Hủy đăng ký FCM Token (Logout)
    @POST("users/me/device-token/remove")
    suspend fun removeFcmToken(@Body request: RemoveTokenRequest): Response<Unit>

    // 2. Lấy danh sách thông báo
    @GET("notifications")
    suspend fun getNotifications(): Response<List<NotificationDto>>

    // 3. Đánh dấu đã đọc
    @POST("notifications/{id}/read")
    suspend fun markNotificationAsRead(@Path("id") notificationId: String): Response<Unit>

    @POST("organizer/register")
    suspend fun registerOrganizer(@Body request: RegisterOrganizerRequest): Response<Unit>

    @GET("organizer/me")
    suspend fun getOrganizerProfile(): Response<OrganizerProfileResponse>

    @GET("organizer/me/events")
    suspend fun getMyEvents(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("status") status: String? = null
    ): Response<MyEventsResponse>

    @GET("organizer/me/stats")
    suspend fun getDashboardStats(): Response<DashboardStatsResponse>

    @POST("organizer/check-in-qr")
    suspend fun checkInQr(@Body request: CheckInRequest): Response<CheckInResponse>

    @POST("events")
    suspend fun createEvent(@Body request: CreateEventRequest): Response<Unit>

    // --- ADMIN ---
    @GET("admin/events/pending")
    suspend fun getPendingEvents(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<List<MyEventDto>> // Tái sử dụng MyEventsResponse vì cấu trúc list giống nhau

    @POST("admin/events/{id}/approve")
    suspend fun approveEvent(@Path("id") eventId: String): Response<Unit>

    @POST("admin/events/{id}/reject")
    suspend fun rejectEvent(
        @Path("id") eventId: String,
        @Body body: Map<String, String> // {"reason": "..."}
    ): Response<Unit>

    // 1.7 Cập nhật Profile Organizer
    @PUT("organizer/me")
    suspend fun updateOrganizerProfile(
        @Body request: UpdateOrganizerProfileRequest
    ): Response<OrganizerProfileResponse> // Trả về profile mới nhất

    // 1.8 Lấy danh sách người tham gia
    @GET("organizer/events/{eventId}/attendees")
    suspend fun getEventAttendees(
        @Path("eventId") eventId: String
    ): Response<EventAttendeesResponse>

    @GET("venues")
    suspend fun getVenues(): Response<List<VenueResponse>>

    // Thêm vào interface EventApiService
    @GET("profiles")
    suspend fun getFeaturedProfiles(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<FeaturedProfileListResponse> // <-- Đã sửa kiểu trả về

    @POST("profiles")
    suspend fun createFeaturedProfile(
        @Body request: CreateProfileRequest
    ): Response<FeaturedProfileDto>

    // 1.5 Thống kê chi tiết 1 sự kiện
    @GET("organizer/events/{eventId}/stats")
    suspend fun getEventStats(@Path("eventId") eventId: String): Response<EventStatsResponse>


    @PUT("events/{id}")
    suspend fun updateEvent(
        @Path("id") eventId: String,
        @Body request: CreateEventRequest // Tái sử dụng DTO này vì cấu trúc giống hệt
    ): Response<Unit>

    @Multipart
    @POST("organizer/events/{eventId}/attendees/import")
    suspend fun importAttendees(
        @Path("eventId") eventId: String,
        @Part file: MultipartBody.Part // Đảm bảo đúng import okhttp3.MultipartBody
    ): Response<ImportAttendeesResponse>

    @GET("organizer/events/{eventId}/attendees/export")
    suspend fun exportAttendees(
        @Path("eventId") eventId: String
    ): Response<ResponseBody> // Trả về file stream

    @POST("organizer/events/{eventId}/broadcast")
    suspend fun broadcastNotification(
        @Path("eventId") eventId: String,
        @Body request: BroadcastRequest
    ): Response<BroadcastResponse>

    @GET("promotions/organizer")
    suspend fun getOrganizerPromotions(): Response<List<PromotionDto>>

    @POST("promotions/organizer")
    suspend fun createPromotion(@Body request: CreatePromotionRequest): Response<PromotionDto>

    @PUT("promotions/organizer/{id}")
    suspend fun updatePromotion(
        @Path("id") id: String,
        @Body request: UpdatePromotionRequest
    ): Response<PromotionDto>

    @DELETE("promotions/organizer/{id}")
    suspend fun deletePromotion(@Path("id") id: String): Response<Unit>

    @Multipart
    @POST("storage/upload")
    suspend fun uploadImage(
        @Part file: okhttp3.MultipartBody.Part,
        @Part("purpose") purpose: okhttp3.RequestBody?
    ): Response<UploadResponse>
}