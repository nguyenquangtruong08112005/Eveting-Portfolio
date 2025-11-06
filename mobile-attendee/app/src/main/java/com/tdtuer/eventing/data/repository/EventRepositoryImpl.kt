package com.tdtuer.eventing.data.repository

import com.tdtuer.eventing.data.mapper.toDomainModel
import com.tdtuer.eventing.data.network.EventApiService
import com.tdtuer.eventing.domain.model.Event
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.failure
import com.tdtuer.eventing.domain.model.success

@Singleton
class EventRepositoryImpl @Inject constructor(
    private val apiService: EventApiService
) : EventRepository {

    override fun getAllEvents(
        page: Int,
        limit: Int,
    ): Flow<Result<List<Event>>> = flow {
        emit(Result.Loading)
        try {
            val response = apiService.getAllEvents(
                page = page,
                limit = limit
            )

            if (response.isSuccessful && response.body() != null) {

                val eventDtoList = response.body()!!.events

                val domainEventList = eventDtoList.map { eventDto ->
                    eventDto.toDomainModel()
                }

                // SỬA LẠI:
                emit(Result.success(domainEventList))
            } else {
                // Lỗi server (4xx, 5xx)
                // SỬA LẠI:
                emit(Result.failure(Exception("Server error: ${response.code()}")))
            }

        } catch (e: Exception) {
            // SỬA LẠI:
            emit(Result.failure(e))
        }
    }

    override fun searchEvents(): Flow<Result<List<Event>>> {
        TODO("Not yet implemented")
    }
}