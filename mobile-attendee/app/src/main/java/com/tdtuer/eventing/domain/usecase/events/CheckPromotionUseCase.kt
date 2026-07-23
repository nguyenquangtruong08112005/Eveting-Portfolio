package com.tdtuer.eventing.domain.usecase.events

import com.tdtuer.eventing.data.network.model.PromotionResponse
import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Result
import javax.inject.Inject

class CheckPromotionUseCase @Inject constructor(
    private val repository: EventRepository
) {
    /**
     * Kiểm tra tính hợp lệ của mã giảm giá cho sự kiện cụ thể.
     */
    suspend operator fun invoke(code: String, eventId: String, quantity: Int): Result<PromotionResponse> {
        return repository.checkPromotion(code, eventId, quantity)
    }
}