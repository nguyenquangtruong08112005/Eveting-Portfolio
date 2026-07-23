package com.tdtuer.eventing.domain.usecase.events

import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Promotion
import com.tdtuer.eventing.domain.model.Result
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetPromotionsUseCase @Inject constructor(
    private val repository: EventRepository
) {
    /**
     * Lấy danh sách các mã giảm giá công khai.
     */
    operator fun invoke(): Flow<Result<List<Promotion>>> {
        return repository.getPublicPromotions()
    }
}