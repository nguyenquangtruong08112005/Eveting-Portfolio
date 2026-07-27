package com.tdtuer.eventing.data.network

import com.tdtuer.eventing.data.network.model.ApplyPromotionRequest
import com.tdtuer.eventing.data.network.model.AuthLoginRequest
import com.tdtuer.eventing.data.network.model.AuthRegisterRequest
import com.tdtuer.eventing.data.network.model.AuthResponse
import com.tdtuer.eventing.data.network.model.BookTicketRequest
import com.tdtuer.eventing.data.network.model.CheckPaymentStatusResponse
import com.tdtuer.eventing.data.network.model.CreatePaymentOrderRequest
import com.tdtuer.eventing.data.network.model.CreatePaymentOrderResponse
import com.tdtuer.eventing.data.network.model.EventDetailDto
import com.tdtuer.eventing.data.network.model.EventDto
import com.tdtuer.eventing.data.network.model.EventListResponse
import com.tdtuer.eventing.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing.data.network.model.GoogleLoginRequest
import com.tdtuer.eventing.data.network.model.FacebookLoginRequest
import com.tdtuer.eventing.data.network.model.PasswordResetRequest
import com.tdtuer.eventing.data.network.model.PasswordResetConfirmRequest
import com.tdtuer.eventing.data.network.model.EmailVerificationRequest
import com.tdtuer.eventing.data.network.model.EmailVerificationConfirmRequest
import com.tdtuer.eventing.data.network.model.MediaResponse
import com.tdtuer.eventing.data.network.model.NotificationDto
import com.tdtuer.eventing.data.network.model.PostMediaRequest
import com.tdtuer.eventing.data.network.model.PostReviewRequest
import com.tdtuer.eventing.data.network.model.PromotionDto
import com.tdtuer.eventing.data.network.model.PromotionResponse
import com.tdtuer.eventing.data.network.model.RefreshTokenRequest
import com.tdtuer.eventing.data.network.model.RemoveTokenRequest
import com.tdtuer.eventing.data.network.model.ReviewResponse
import com.tdtuer.eventing.data.network.model.TicketDetailResponse
import com.tdtuer.eventing.data.network.model.UpdateUserRequest
import com.tdtuer.eventing.data.network.model.UserDto
import com.tdtuer.eventing.data.network.model.UserTicketResponse
import com.tdtuer.eventing.data.network.model.UploadResponse
import com.tdtuer.eventing.data.network.model.WeatherDto
import com.tdtuer.eventing.domain.model.Ticket
import com.tdtuer.eventing.domain.usecase.payment.CreateZaloPayOrderUseCase
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
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
        @Body request: BookTicketRequest,
        @Header("X-Idempotency-Key") idempotencyKey: String
    ): Response<Ticket>

    @POST("payments/create-order")
    suspend fun createZaloPayOrder(
        @Body request: CreatePaymentOrderRequest,
        @Header("X-Idempotency-Key") idempotencyKey: String
    ): Response<CreatePaymentOrderResponse>

    @POST("payments/check-status")
    suspend fun checkPaymentStatus(
        @Body body: Map<String, String>,
        @Header("X-Idempotency-Key") idempotencyKey: String
    ): Response<CheckPaymentStatusResponse>

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

    @Multipart
    @POST("events/{eventId}/media")
    suspend fun uploadEventMediaMultipart(
        @Path("eventId") eventId: String,
        @Part file: okhttp3.MultipartBody.Part
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

    @GET("profiles/{id}")
    suspend fun getFeaturedProfileById(
        @Path("id") profileId: String
    ): Response<FeaturedProfileDto>

    @POST("users/me/follow")
    suspend fun followProfile(@Body body: Map<String, String>): Response<Unit> // body: {"profileId": "..."}

    @DELETE("users/me/follow/{profileId}")
    suspend fun unfollowProfile(@Path("profileId") profileId: String): Response<Unit>

    @POST("promotions/apply")
    suspend fun checkPromotion(@Body request: ApplyPromotionRequest): Response<PromotionResponse>

    @GET("promotions")
    suspend fun getPublicPromotions(): Response<List<PromotionDto>>

    @POST("auth/register")
    suspend fun register(@Body request: AuthRegisterRequest): Response<AuthResponse>

    @POST("auth/login")
    suspend fun login(@Body request: AuthLoginRequest): Response<AuthResponse>



    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<AuthResponse>

    @POST("auth/logout")
    suspend fun logout(@Body request: RefreshTokenRequest): Response<Unit>

    @POST("auth/google-login")
    suspend fun googleLogin(@Body request: GoogleLoginRequest): Response<AuthResponse>

    @POST("auth/facebook-login")
    suspend fun facebookLogin(@Body request: FacebookLoginRequest): Response<AuthResponse>

    @POST("auth/password-reset/request")
    suspend fun requestPasswordReset(@Body request: PasswordResetRequest): Response<Unit>

    @POST("auth/password-reset/confirm")
    suspend fun confirmPasswordReset(@Body request: PasswordResetConfirmRequest): Response<Unit>

    @POST("auth/email-verification/request")
    suspend fun requestEmailVerification(@Body request: EmailVerificationRequest): Response<Unit>

    @POST("auth/email-verification/confirm")
    suspend fun confirmEmailVerification(@Body request: EmailVerificationConfirmRequest): Response<Unit>

    @Multipart
    @POST("storage/upload")
    suspend fun uploadImage(
        @Part file: okhttp3.MultipartBody.Part,
        @Part("purpose") purpose: okhttp3.RequestBody?
    ): Response<UploadResponse>
}
