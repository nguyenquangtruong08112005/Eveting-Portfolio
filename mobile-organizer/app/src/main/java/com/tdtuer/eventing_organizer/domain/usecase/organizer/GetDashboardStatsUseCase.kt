package com.tdtuer.eventing_organizer.domain.usecase.organizer

import com.tdtuer.eventing_organizer.data.network.model.DashboardStatsResponse
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Result
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetDashboardStatsUseCase @Inject constructor(
    private val repository: EventRepository
) {
    operator fun invoke(): Flow<Result<DashboardStatsResponse>> {
        return repository.getDashboardStats()
    }
}