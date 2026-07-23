package com.tdtuer.eventing.domain.usecase.events

import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.ui.screens.postevent.ReviewItem
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

/**
 * UseCase để lấy danh sách đánh giá của một sự kiện.
 */
class GetEventReviewsUseCase @Inject constructor(
    private val repository: EventRepository
) {
    /**
     * @param eventId ID của sự kiện cần lấy review.
     * @return Flow chứa kết quả danh sách ReviewItem.
     */
    operator fun invoke(eventId: String): Flow<Result<List<ReviewItem>>> {
        return repository.getEventReviews(eventId)
    }
}