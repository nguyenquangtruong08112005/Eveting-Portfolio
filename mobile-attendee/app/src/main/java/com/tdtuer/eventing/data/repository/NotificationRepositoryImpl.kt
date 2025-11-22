package com.tdtuer.eventing.data.repository

import com.tdtuer.eventing.data.mapper.toDomainModel
import com.tdtuer.eventing.data.network.EventApiService
import com.tdtuer.eventing.domain.model.Notification
import com.tdtuer.eventing.domain.model.Result
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationRepositoryImpl @Inject constructor(
    private val apiService: EventApiService
) : NotificationRepository {

    override fun getNotifications(): Flow<Result<List<Notification>>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getNotifications()
            if (response.isSuccessful && response.body() != null) {
                val list = response.body()!!.map { it.toDomainModel() }
                emit(Result.Success(list))
            } else {
                emit(Result.Failure(Exception("Failed to fetch notifications: ${response.code()}")))
            }
        } catch (e: Exception) {
            emit(Result.Failure(e))
        }
    }

    override suspend fun markAsRead(notificationId: String): Result<Unit> {
        return try {
            val response = apiService.markNotificationAsRead(notificationId)
            if (response.isSuccessful) Result.Success(Unit)
            else Result.Failure(Exception("Failed to mark as read"))
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }
}