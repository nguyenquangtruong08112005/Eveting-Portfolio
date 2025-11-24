package com.tdtuer.eventing_organizer.data.network

import com.tdtuer.eventing_organizer.data.network.model.District
import com.tdtuer.eventing_organizer.data.network.model.Province
import com.tdtuer.eventing_organizer.data.network.model.Ward
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface AddressApiService {
    // Lấy tất cả tỉnh (depth=1 mặc định)
    @GET("p/")
    suspend fun getProvinces(): Response<List<Province>>

    // Lấy huyện của 1 tỉnh (depth=2 để lấy cả huyện)
    @GET("p/{code}")
    suspend fun getDistrictsByProvince(
        @Path("code") provinceCode: Int,
        @Query("depth") depth: Int = 2
    ): Response<Province>

    // Lấy xã của 1 huyện (depth=2 để lấy xã)
    @GET("d/{code}")
    suspend fun getWardsByDistrict(
        @Path("code") districtCode: Int,
        @Query("depth") depth: Int = 2
    ): Response<District>
}
