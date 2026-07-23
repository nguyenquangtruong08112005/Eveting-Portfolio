package com.tdtuer.eventing.domain.usecase.events

import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Result
import javax.inject.Inject

/**
 * UseCase để đăng tải đánh giá cho một sự kiện.
 */
class PostEventReviewUseCase @Inject constructor(
    private val repository: EventRepository
) {
    /**
     * @param eventId ID của sự kiện.
     * @param rating Số sao đánh giá (1-5).
     * @param comment Nội dung bình luận.
     */
    suspend operator fun invoke(eventId: String, rating: Int, comment: String): Result<Unit> {
        return repository.postEventReview(eventId, rating, comment)
    }
}