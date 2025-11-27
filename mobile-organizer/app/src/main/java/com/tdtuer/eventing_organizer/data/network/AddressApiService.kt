package com.tdtuer.eventing_organizer.data.network

import com.tdtuer.eventing_organizer.data.network.model.District
import com.tdtuer.eventing_organizer.data.network.model.Province
import com.tdtuer.eventing_organizer.data.network.model.Ward
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface AddressApiService {
    @GET("p/")
    suspend fun getProvinces(): Response<List<Province>>

    @GET("p/{code}")
    suspend fun getDistrictsByProvince(
        @Path("code") code: Int,
        @Query("depth") depth: Int = 2
    ): Response<Province>

    @GET("d/{code}")
    suspend fun getWardsByDistrict(
        @Path("code") code: Int,
        @Query("depth") depth: Int = 2
    ): Response<District>
}