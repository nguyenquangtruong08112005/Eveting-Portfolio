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
     * @param status: Lọc theo trạng thái.
     * @param page: Trang hiện tại.
     * @param limit: Số lượng item mỗi trang.
     */
    operator fun invoke(status: String? = null, page: Int = 1, limit: Int = 20): Flow<Result<List<MyEventDto>>> {
        return repository.getMyEvents(status, page, limit)
    }
}