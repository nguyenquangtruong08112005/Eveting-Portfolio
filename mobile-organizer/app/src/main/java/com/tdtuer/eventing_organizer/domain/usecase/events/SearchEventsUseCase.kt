// eventing.zip/domain/usecase/events/SearchEventsUseCase.kt (CẬP NHẬT)
package com.tdtuer.eventing_organizer.domain.usecase.events

import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Event
import com.tdtuer.eventing_organizer.domain.model.FilterParams //
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import com.tdtuer.eventing_organizer.domain.model.Result

class SearchEventsUseCase @Inject constructor(
    private val eventRepository: EventRepository
) {
    operator fun invoke(
        params: FilterParams
    ): Flow<Result<List<Event>>> {

        // logic "dịch" từ FilterParams sang các tham số của API
        return eventRepository.searchEvents( //
            query = params.query,
            location = params.location,

            // !! LƯU Ý: API chỉ hỗ trợ 1 category, nhưng UI hỗ trợ nhiều.
            // Chúng ta tạm thời chỉ lấy cái đầu tiên.
            category = params.categories.firstOrNull(),

            datePreset = params.datePreset,
            startDate = params.customDateRange?.first,
            endDate = params.customDateRange?.second,
            minPrice = params.priceRange?.first,
            maxPrice = params.priceRange?.second,

            sortBy = params.sortBy,
            sortOrder = params.sortOrder,
            hasVideo = params.hasVideo, // Truyền vào repository

            page = params.page,
            limit = params.limit
        )
    }
}