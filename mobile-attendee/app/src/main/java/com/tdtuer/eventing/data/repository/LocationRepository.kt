package com.tdtuer.eventing.data.repository

import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.UserLocation

interface LocationRepository {
    /**
     * Lấy vị trí hiện tại của thiết bị.
     * Hàm này giả định quyền đã được cấp ở UI.
     */
    suspend fun getCurrentLocation(): Result<UserLocation>

    /**
     * Lấy địa chỉ từ tọa độ (Reverse Geocoding).
     */
    suspend fun getAddressFromCoordinates(lat: Double, lon: Double): String
}