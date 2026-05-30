package com.tdtuer.eventing.data.repository

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.core.content.res.ResourcesCompat
import com.tdtuer.eventing.R
import com.tdtuer.eventing.data.local.dao.TicketDao // Import DAO
import com.tdtuer.eventing.data.local.entity.toDetailedTicket
import com.tdtuer.eventing.data.local.entity.toEntity // Import Mapper
import com.tdtuer.eventing.data.mapper.toDomainModel
import com.tdtuer.eventing.data.network.EventApiService
import com.tdtuer.eventing.data.network.model.BookTicketRequest
import com.tdtuer.eventing.data.network.model.CreatePaymentOrderRequest
import com.tdtuer.eventing.data.network.model.CreatePaymentOrderResponse
import com.tdtuer.eventing.data.network.model.UserTicketDto
import com.tdtuer.eventing.domain.model.DetailedTicket
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Ticket
import com.tdtuer.eventing.domain.model.failure
import com.tdtuer.eventing.domain.model.success
import com.tdtuer.eventing.helpers.formatTimestampToDay
import com.tdtuer.eventing.helpers.formatTimestampToHour
import com.tdtuer.eventing.helpers.formatTimestampToMinute
import com.tdtuer.eventing.helpers.formatTimestampToMonth
import com.tdtuer.eventing.helpers.formatTimestampToYear
import com.tdtuer.eventing.helpers.generateBarCodeBitmap
import com.tdtuer.eventing.helpers.generateQrCodeBitmap
import com.tdtuer.eventing.ui.screens.ticket.SaveRequest
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import java.io.OutputStream
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TicketRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    private val apiService: EventApiService,
    private val ticketDao: TicketDao // Inject DAO
) : TicketRepository {

    override suspend fun bookTicket(
        eventId: String,
        ticketType: String,
        quantity: Int,
        promoCode: String?
    ): Result<Ticket> {
        return try {
            val request = BookTicketRequest(
                eventId = eventId,
                ticketType = ticketType,
                quantity = quantity,
                promoCode = promoCode
            )
            val response = apiService.bookTicket(request = request)

            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Server error: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun createZaloPayOrder(ticketId: String): Result<CreatePaymentOrderResponse> {
        return try {
            val request = CreatePaymentOrderRequest(ticketId = ticketId)
            val response = apiService.createZaloPayOrder(request = request)

            if (response.isSuccessful && response.body() != null) {
                if (response.body()!!.returnCode == 1) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception(response.body()!!.returnMessage))
                }
            } else {
                Result.failure(Exception("Server error zalopay: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // [REFACTORED] Hỗ trợ Offline cho chi tiết vé
    override suspend fun getTicketDetails(ticketId: String): Result<DetailedTicket> {
        // 1. Thử gọi API lấy dữ liệu mới nhất
        try {
            val response = apiService.getTicketDetails(ticketId)
            if (response.isSuccessful && response.body() != null) {
                return Result.success(response.body()!!.toDomainModel())
            }
        } catch (e: Exception) {
            // Log lỗi mạng nhưng không return ngay
            Log.e("TicketRepo", "Failed to fetch remote details: ${e.message}")
        }

        // 2. Fallback: Nếu API lỗi, tìm trong Cache
        return try {
            // Lấy danh sách vé đã cache (getUserTickets đã lưu vào DB)
            val cachedTicket = ticketDao.getUserTickets().find { it.id == ticketId }

            if (cachedTicket != null) {
                // Map từ Entity sang DetailedTicket (Domain)
                // Chúng ta cần tạo hàm mở rộng toDetailedTicket() cho TicketEntity
                Result.success(cachedTicket.toDetailedTicket())
            } else {
                Result.failure(Exception("Không thể tải vé (Offline và không có cache)"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- CẬP NHẬT HÀM NÀY: CACHING ---
    override suspend fun getUserTickets(page: Int, limit: Int): Flow<Result<List<UserTicketDto>>> = flow {
        emit(Result.Loading)

        // Log.d("TicketRepo", "Fetching tickets...")

        // 1. Thử gọi API trước (Ưu tiên dữ liệu mới nhất cho vé vì trạng thái thay đổi nhanh: paid -> checkedIn)
        try {
            val response = apiService.getUserTickets(page, limit)
            if (response.isSuccessful && response.body() != null) {
                val dtos = response.body()!!.tickets

                // Lưu vào Cache (Chỉ cache trang 1 hoặc cache tất cả tùy chiến lược, ở đây cache tất cả những gì load được)
                try {
                    val entities = dtos.map { it.toEntity() }
                    // Nếu là trang 1 (làm mới), xóa cũ lưu mới. Nếu load more, chỉ chèn thêm.
                    if (page == 1) {
                        ticketDao.updateCache(entities)
                    } else {
                        ticketDao.insertAll(entities)
                    }
                } catch (e: Exception) {
                    Log.e("TicketRepo", "Failed to cache tickets", e)
                }

                emit(Result.success(dtos))
            } else {
                throw Exception("Server Error: ${response.code()}")
            }
        } catch (e: Exception) {
            // 2. Nếu lỗi mạng -> Fallback về Local Cache
            Log.e("TicketRepo", "Network error (${e.message}). Trying offline cache.")

            // Lấy từ DB và map ngược lại DTO (để tương thích với UseCase hiện tại)
            // Lưu ý: TicketDao trả về TicketEntity, cần map sang UserTicketDto hoặc sửa UseCase để nhận Entity/Domain trực tiếp.
            // Ở đây để nhanh gọn, ta sửa lại cấu trúc hàm này trả về List<UserTicketDto> giả lập từ Entity.
            // Tuy nhiên, cách tốt nhất là sửa getUserTicketsUseCase để nhận List<MyTicketUiModel> hoặc Domain Model.

            // Giả sử ta map thủ công ở đây để không phá vỡ flow cũ:
            val localEntities = ticketDao.getUserTickets()
            if (localEntities.isNotEmpty()) {
                val dtos = localEntities.map { entity ->
                    // Map ngược Entity -> DTO (Hơi ngược nhưng giữ compatible)
                    // Bạn cần tạo hàm map này hoặc map thủ công
                    UserTicketDto(
                        id = entity.id,
                        status = entity.status,
                        type = entity.ticketType,
                        price = entity.price,
                        seat = entity.seat,
                        qrCode = entity.qrCode,
                        purchaseDate = entity.purchaseDate,
                        event = com.tdtuer.eventing.data.network.model.TicketEventSummaryDto(
                            id = entity.eventId,
                            name = entity.eventName,
                            date = entity.eventDate,
                            imageUrl = entity.eventImageUrl,
                            venueName = entity.location.split(",").firstOrNull(),
                            city = entity.location.split(",").lastOrNull(),
                            status = "active" // Giả định
                        )
                    )
                }
                emit(Result.success(dtos))
            } else {
                emit(Result.failure(e))
            }
        }
    }

    // ... (saveTicketImages và createTicketTemplate giữ nguyên) ...
    override suspend fun saveTicketImages(request: SaveRequest): Result<Unit> {
        return try {
            val safeName = request.eventName.replace(Regex("[^A-Za-z0-9]"), "_")
            val ticketIdShort = request.ticketId.takeLast(6)

            val qrBitmap = generateQrCodeBitmap(request.qrCodeData)
            val qrTemplate = createTicketTemplate(context, request, qrBitmap, true)
            saveImageBitmapToMediaStore(context, qrTemplate, "${safeName}_${ticketIdShort}_QR.png")

            val barBitmap = generateBarCodeBitmap(request.qrCodeData)
            val barTemplate = createTicketTemplate(context, request, barBitmap, false)
            saveImageBitmapToMediaStore(
                context,
                barTemplate,
                "${safeName}_${ticketIdShort}_Barcode.png"
            )

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun createTicketTemplate(
        context: Context,
        request: SaveRequest,
        codeBitmap: Bitmap,
        isQrCode: Boolean
    ): Bitmap {
        val templateWidth = 800
        val templateHeight = if (isQrCode) 1000 else 650
        val padding = 40f

        val boldTypeface = try {
            ResourcesCompat.getFont(context, R.font.poppins_bold) ?: Typeface.DEFAULT_BOLD
        } catch (e: Exception) {
            Typeface.DEFAULT_BOLD
        }

        val regularTypeface = try {
            ResourcesCompat.getFont(context, R.font.poppins_regular) ?: Typeface.DEFAULT
        } catch (e: Exception) {
            Typeface.DEFAULT
        }

        val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.BLACK
            textSize = 42f
            typeface = boldTypeface
        }
        val dataPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.BLACK
            textSize = 32f
            typeface = regularTypeface
        }
        val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.GRAY
            textSize = 28f
            typeface = regularTypeface
        }
        val whiteBgPaint = Paint().apply { color = Color.WHITE }

        val finalBitmap =
            Bitmap.createBitmap(templateWidth, templateHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(finalBitmap)

        canvas.drawRect(0f, 0f, templateWidth.toFloat(), templateHeight.toFloat(), whiteBgPaint)

        canvas.drawText(request.eventName, padding, padding + 40f, titlePaint)

        canvas.drawText("Ticket ID:", padding, padding + 120f, labelPaint)
        canvas.drawText(request.ticketId, padding, padding + 160f, dataPaint)

        val codeTop = padding + 220f
        val codeWidth = (templateWidth - padding * 2)
        val codeHeight = if (isQrCode) codeWidth else 200f

        val scaledCode =
            Bitmap.createScaledBitmap(codeBitmap, codeWidth.toInt(), codeHeight.toInt(), false)
        canvas.drawBitmap(scaledCode, padding, codeTop, null)

        canvas.drawText(
            "Generated by Mobile Eventing",
            padding,
            templateHeight - padding,
            labelPaint
        )

        return finalBitmap
    }

    private suspend fun saveImageBitmapToMediaStore(
        context: Context,
        bitmap: Bitmap,
        fileName: String
    ) {
        withContext(Dispatchers.IO) {
            val resolver = context.contentResolver
            val imageCollection: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            } else {
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI
            }

            val contentValues = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
                put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(
                        MediaStore.Images.Media.RELATIVE_PATH,
                        "${Environment.DIRECTORY_PICTURES}/Eventing"
                    )
                    put(MediaStore.Images.Media.IS_PENDING, 1)
                }
            }

            var uri: Uri? = null
            try {
                uri = resolver.insert(imageCollection, contentValues)
                    ?: throw Exception("MediaStore.insert LỖI: Trả về null uri")

                val outputStream: OutputStream = resolver.openOutputStream(uri)
                    ?: throw Exception("ContentResolver.openOutputStream LỖI: Trả về null stream")

                outputStream.use { stream ->
                    if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)) {
                        throw Exception("Bitmap.compress LỖI: Không thể nén ảnh")
                    }
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    contentValues.clear()
                    contentValues.put(MediaStore.Images.Media.IS_PENDING, 0)
                    resolver.update(uri, contentValues, null, null)
                }
            } catch (e: Exception) {
                uri?.let { resolver.delete(it, null, null) }
                throw e
            }
        }
    }
}