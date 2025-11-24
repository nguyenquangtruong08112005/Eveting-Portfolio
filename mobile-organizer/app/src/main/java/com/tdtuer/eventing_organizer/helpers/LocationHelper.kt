package com.tdtuer.eventing_organizer.helpers

import android.content.Context
import android.location.Address
import android.location.Geocoder
import java.util.Locale

// Data class nội bộ để trả về kết quả tách
data class AddressComponents(
    val fullAddress: String,
    val street: String = "",
    val ward: String = "",
    val district: String = "",
    val city: String = ""
)

fun getAddressDetailsFromCoordinates(context: Context, latitude: Double, longitude: Double): AddressComponents {
    // Sử dụng Locale.getDefault() để ưu tiên ngôn ngữ máy (thường là tiếng Việt)
    val geocoder = Geocoder(context, Locale.getDefault())
    return try {
        @Suppress("DEPRECATION")
        val addresses = geocoder.getFromLocation(latitude, longitude, 1)

        if (addresses != null && addresses.isNotEmpty()) {
            val address: Address = addresses[0]

            // Mapping các field của Android Address sang cấu trúc Việt Nam
            // Lưu ý: Mapping này có thể không chính xác 100% tùy thuộc vào dữ liệu Google Maps trả về ở từng vùng

            val streetName = address.thoroughfare ?: ""
            val houseNumber = address.subThoroughfare ?: ""
            // Ghép số nhà và tên đường
            val streetFull = if (houseNumber.isNotEmpty()) "$houseNumber $streetName" else streetName

            val ward = address.subLocality ?: ""
            val district = address.subAdminArea ?: ""

            // Chuẩn hóa tên thành phố để cố gắng khớp với danh sách 63 tỉnh
            var city = address.adminArea ?: ""
            if (city.contains("Ho Chi Minh")) city = "TP. Hồ Chí Minh"
            if (city.contains("Ha Noi")) city = "Hà Nội"
            if (city.contains("Da Nang")) city = "Đà Nẵng"

            // Lấy dòng địa chỉ đầy đủ đẹp nhất do Google format
            val fullAddress = address.getAddressLine(0) ?: ""

            AddressComponents(
                fullAddress = fullAddress,
                street = streetFull.trim(),
                ward = ward,
                district = district,
                city = city
            )
        } else {
            AddressComponents("Unknown Location")
        }
    } catch (e: Exception) {
        e.printStackTrace()
        AddressComponents("Could not get address")
    }
}