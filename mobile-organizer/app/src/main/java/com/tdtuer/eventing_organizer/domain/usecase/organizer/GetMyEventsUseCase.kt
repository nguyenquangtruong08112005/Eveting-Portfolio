package com.tdtuer.eventing_organizer.domain.usecase.organizer

import com.tdtuer.eventing_organizer.data.network.model.MyEventDto
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Result
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetMyEventsUseCase @Inject constructor(
    private val repository: EventRepository
) {
    /**
     * @param status: Lọc theo trạng thái (pending, active, rejected, v.v.). Null = lấy tất cả.
     */
    operator fun invoke(status: String? = null): Flow<Result<List<MyEventDto>>> {
        return repository.getMyEvents(status)
    }
}