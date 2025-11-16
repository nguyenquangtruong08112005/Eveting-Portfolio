package com.tdtuer.eventing.data.network

import com.tdtuer.eventing.data.network.model.BookTicketRequest
import com.tdtuer.eventing.data.network.model.CreatePaymentOrderRequest
import com.tdtuer.eventing.data.network.model.CreatePaymentOrderResponse
import com.tdtuer.eventing.data.network.model.EventDetailDto
import com.tdtuer.eventing.data.network.model.EventListResponse
import com.tdtuer.eventing.data.network.model.TicketDetailResponse
import com.tdtuer.eventing.domain.model.Ticket
import com.tdtuer.eventing.domain.usecase.payment.CreateZaloPayOrderUseCase
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
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
        @Query("category") category: String?,
        @Query("date") date: String?,
        @Query("sortBy") sortBy: String?,
        @Query("sortOrder") sortOrder: String?,
        @Query("page") page: Int,
        @Query("limit") limit: Int,
    ): Response<EventListResponse>

    @POST("tickets/book")
    suspend fun bookTicket(
        @Body request: BookTicketRequest
    ) : Response<Ticket>

    @POST("payments/create-order")
    suspend fun createZaloPayOrder(
        @Body request: CreatePaymentOrderRequest
    ): Response<CreatePaymentOrderResponse>

    @GET("tickets/{ticketId}")
    suspend fun getTicketDetails(
        @Path("ticketId") ticketId: String
    ): Response<TicketDetailResponse>
}