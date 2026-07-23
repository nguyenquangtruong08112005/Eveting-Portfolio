package com.tdtuer.eventing_organizer.domain.usecase.tickets

import com.tdtuer.eventing_organizer.data.repository.TicketRepository
// Xóa import helpers (không cần nữa)
import com.tdtuer.eventing_organizer.domain.model.Result // <-- THÊM IMPORT
import com.tdtuer.eventing_organizer.ui.model.SaveRequest
import javax.inject.Inject

class SaveTicketUseCase @Inject constructor(
    private val repository: TicketRepository
) {
    suspend operator fun invoke(request: SaveRequest): Result<Unit> {
        // Logic nghiệp vụ (tạo bitmap, tên file) đã được chuyển vào RepositoryImpl.
        // UseCase chỉ cần gọi Repository.
        return repository.saveTicketImages(request)
    }
}