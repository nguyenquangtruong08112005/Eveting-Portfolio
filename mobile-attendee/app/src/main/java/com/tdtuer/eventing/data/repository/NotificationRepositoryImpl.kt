package com.tdtuer.eventing.data.repository

import android.text.format.DateUtils
import com.tdtuer.eventing.data.local.dao.NotificationDao
import com.tdtuer.eventing.data.local.entity.toDomain
import com.tdtuer.eventing.data.local.entity.toEntity
import com.tdtuer.eventing.data.network.EventApiService
import com.tdtuer.eventing.domain.model.Notification
import com.tdtuer.eventing.domain.model.Result
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationRepositoryImpl @Inject constructor(
    private val apiService: EventApiService,
    private val notificationDao: NotificationDao // Inject DAO
) : NotificationRepository {

    override fun getNotifications(): Flow<Result<List<Notification>>> = flow {
        emit(Result.Loading)

        // 1. Emit Local Data (Offline First)
        try {
            val localData = notificationDao.getAllNotifications().map { it.toDomain() }
            if (localData.isNotEmpty()) {
                emit(Result.Success(localData))
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // 2. Fetch Remote Data
        try {
            val response = apiService.getNotifications()
            if (response.isSuccessful && response.body() != null) {
                val dtos = response.body()!!

                // Map DTO sang Entity để lưu Cache
                val entities = dtos.map { dto ->
                    // Tính toán timeAgo ngay lúc lưu
                    val timeAgo = DateUtils.getRelativeTimeSpanString(
                        dto.createdAt,
                        System.currentTimeMillis(),
                        DateUtils.MINUTE_IN_MILLIS
                    ).toString()

                    dto.toEntity(timeAgo)
                }

                // Lưu vào DB
                notificationDao.updateCache(entities)

                // Emit dữ liệu mới nhất từ Entity (để đảm bảo đồng bộ)
                val domainList = entities.map { it.toDomain() }
                emit(Result.Success(domainList))
            } else {
                // Nếu API lỗi mà chưa có dữ liệu local thì mới báo lỗi
                // Nếu đã có local data rồi thì user vẫn xem được bản cũ
                val localData = notificationDao.getAllNotifications()
                if (localData.isEmpty()) {
                    emit(Result.Failure(Exception("Failed to fetch notifications: ${response.code()}")))
                }
            }
        } catch (e: Exception) {
            // Lỗi mạng -> Fallback về cache nếu có
            val localData = try { notificationDao.getAllNotifications().map { it.toDomain() } } catch (ex: Exception) { emptyList() }

            if (localData.isNotEmpty()) {
                emit(Result.Success(localData))
            } else {
                emit(Result.Failure(e))
            }
        }
    }

    override suspend fun markAsRead(notificationId: String): Result<Unit> {
        return try {
            // 1. Cập nhật Local ngay lập tức để UI phản hồi nhanh (Optimistic Update)
            notificationDao.markAsRead(notificationId)

            // 2. Gọi API
            val response = apiService.markNotificationAsRead(notificationId)
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                // Nếu API lỗi, có thể revert lại trạng thái local ở đây nếu muốn chặt chẽ
                Result.Failure(Exception("Failed to mark as read"))
            }
        } catch (e: Exception) {
            Result.Failure(e)
        }
    }
}