package com.tdtuer.eventing.data.repository

import android.annotation.SuppressLint
import android.content.Context
import android.location.Geocoder
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.UserLocation
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocationRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    private val fusedLocationClient: FusedLocationProviderClient
) : LocationRepository {

    @SuppressLint("MissingPermission") // Quyền được check ở UI/ViewModel trước khi gọi
    override suspend fun getCurrentLocation(): Result<UserLocation> {
        return try {
            // Sử dụng Priority.PRIORITY_HIGH_ACCURACY để lấy vị trí chính xác nhất
            // getCurrentLocation tốt hơn lastLocation vì nó force lấy mới nếu cần
            val location = fusedLocationClient.getCurrentLocation(
                Priority.PRIORITY_HIGH_ACCURACY,
                CancellationTokenSource().token
            ).await()

            if (location != null) {
                Result.Success(UserLocation(location.latitude, location.longitude))
            } else {
                Result.Failure(Exception("Could not retrieve location"))
            }
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }

    override suspend fun getAddressFromCoordinates(lat: Double, lon: Double): String {
        return withContext(Dispatchers.IO) {
            try {
                val geocoder = Geocoder(context, Locale.US) // Hoặc Locale.getDefault()
                val addresses = geocoder.getFromLocation(lat, lon, 1)

                if (!addresses.isNullOrEmpty()) {
                    val address = addresses[0]
                    val city = address.locality
                    val district = address.subAdminArea
                    val province = address.adminArea

                    city ?: district ?: province ?: "Unknown Location"
                } else {
                    "Address not found"
                }
            } catch (e: Exception) {
                "Unknown Location"
            }
        }
    }
}