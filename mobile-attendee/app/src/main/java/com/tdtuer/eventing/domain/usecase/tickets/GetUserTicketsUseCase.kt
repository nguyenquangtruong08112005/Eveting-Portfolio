package com.tdtuer.eventing.domain.usecase.tickets

import com.tdtuer.eventing.data.mapper.toMyTicketUiModel
import com.tdtuer.eventing.data.repository.TicketRepository
import com.tdtuer.eventing.domain.model.MyTicketUiModel
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.failure
import com.tdtuer.eventing.domain.model.success
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class GetUserTicketsUseCase @Inject constructor(
    private val repository: TicketRepository
) {
    suspend operator fun invoke(page: Int = 1, limit: Int = 20): Flow<Result<List<MyTicketUiModel>>> {
        return repository.getUserTickets(page, limit).map { result ->
            when (result) {
                is Result.Success -> {
                    // Sử dụng mapper extension function đã tách riêng
                    val uiModels = result.data.map { it.toMyTicketUiModel() }
                    Result.success(uiModels)
                }
                is Result.Failure -> Result.failure(result.exception)
                is Result.Loading -> Result.Loading
            }
        }
    }
}