package com.tdtuer.eventing.domain.usecase.tickets

import com.tdtuer.eventing.data.repository.TicketRepository
import com.tdtuer.eventing.helpers.generateBarCodeBitmap
import com.tdtuer.eventing.helpers.generateQrCodeBitmap
import com.tdtuer.eventing.ui.screens.ticket.SaveRequest
import javax.inject.Inject

class SaveTicketUseCase @Inject constructor(
    private val repository: TicketRepository // (Giả sử bạn đã tạo)
) {
    suspend operator fun invoke(request: SaveRequest): Result<Unit> {
        try {
            // Logic nghiệp vụ: Tạo 2 bitmap
            val qrBitmap = generateQrCodeBitmap(request.qrCodeData)
            val barBitmap = generateBarCodeBitmap(request.qrCodeData)

            // Logic nghiệp vụ: Quyết định tên file
            val safeName = request.eventName.replace(Regex("[^A-Za-z0-9]"), "_")
            val ticketIdShort = request.ticketId.takeLast(6)

            // Gọi Repository (Layer Data) 2 lần
            repository.saveImageToGallery(qrBitmap, "${safeName}_${ticketIdShort}_QR.png")
            repository.saveImageToGallery(barBitmap, "${safeName}_${ticketIdShort}_Barcode.png")

            return Result.success(Unit)
        } catch (e: Exception) {
            return Result.failure(e)
        }
    }
}