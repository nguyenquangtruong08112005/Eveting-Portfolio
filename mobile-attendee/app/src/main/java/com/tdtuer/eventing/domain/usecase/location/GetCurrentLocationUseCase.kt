package com.tdtuer.eventing.domain.usecase.location

import com.tdtuer.eventing.data.repository.LocationRepository
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.UserLocation
import javax.inject.Inject

class GetCurrentLocationUseCase @Inject constructor(
    private val repository: LocationRepository
) {
    /**
     * @param includeAddress Nếu true, sẽ gọi thêm geocoding để lấy tên địa chỉ.
     */
    suspend operator fun invoke(includeAddress: Boolean = false): Result<UserLocation> {
        val locationResult = repository.getCurrentLocation()

        if (includeAddress && locationResult is Result.Success) {
            val loc = locationResult.data
            val addressName = repository.getAddressFromCoordinates(loc.latitude, loc.longitude)
            return Result.Success(loc.copy(addressName = addressName))
        }

        return locationResult
    }
}