package com.tdtuer.eventing.helpers

import android.content.Context
import android.location.Geocoder
import java.io.IOException
import java.util.Locale

/**
 * Chuyển đổi tọa độ địa lý thành một chuỗi địa chỉ mà con người đọc được.
 *
 * Chức năng này thực hiện mã hóa địa lý ngược (reverse geocoding) và có thể liên quan đến I/O mạng.
 * Nó nên được gọi từ một background thread (ví dụ: trong một coroutine sử dụng Dispatchers.IO).
 *
 * @param context The application context.
 * @param latitude Vĩ độ của vị trí.
 * @param longitude Kinh độ của vị trí.
 * @return Một chuỗi địa chỉ được định dạng (ví dụ: "Đà Nẵng, Việt Nam") hoặc một chuỗi thay thế nếu không tìm thấy địa chỉ.
 */
fun getAddressFromCoordinates(context: Context, latitude: Double, longitude: Double): String {
    // Geocoder cần Context để hoạt động
    val geocoder = Geocoder(context, Locale.getDefault())
    return try {
        // Lấy danh sách địa chỉ từ tọa độ. Số 1 có nghĩa là chúng ta chỉ muốn 1 kết quả chính xác nhất.
        val addresses = geocoder.getFromLocation(latitude, longitude, 1)

        if (addresses != null && addresses.isNotEmpty()) {
            val address = addresses[0]
            // Xây dựng một chuỗi địa chỉ đơn giản. Bạn có thể tùy chỉnh phần này.
            val locality = address.locality // ví dụ: "Đà Nẵng"
            val country = address.countryName // ví dụ: "Việt Nam"

            when {
                locality != null && country != null -> "$locality, $country"
                locality != null -> locality
                country != null -> country
                else -> "Unknown Location"
            }
        } else {
            "Address not found"
        }
    } catch (e: IOException) {
        // Điều này có thể xảy ra nếu không có mạng hoặc dịch vụ geocoder không chạy.
        "Could not get address"
    }
}
