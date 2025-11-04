package com.tdtuer.eventing.data.network

import com.tdtuer.eventing.data.network.model.EventListResponse
import retrofit2.Response
import retrofit2.http.GET

interface EventApiService {

    @GET("events")
    suspend fun getAllEvents(): Response<EventListResponse>



}