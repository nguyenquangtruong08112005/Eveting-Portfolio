package com.tdtuer.eventing.domain.usecase.tickets

import com.tdtuer.eventing.data.repository.TicketRepository
// Xóa import helpers (không cần nữa)
import com.tdtuer.eventing.domain.model.Result // <-- THÊM IMPORT
import com.tdtuer.eventing.ui.screens.ticket.SaveRequest
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