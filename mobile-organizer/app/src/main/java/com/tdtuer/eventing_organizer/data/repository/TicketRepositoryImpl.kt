package com.tdtuer.eventing_organizer.data.repository

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
import androidx.core.content.res.ResourcesCompat
import com.tdtuer.eventing_organizer.R
import com.tdtuer.eventing_organizer.data.mapper.toDomainModel
import com.tdtuer.eventing_organizer.data.network.EventApiService
import com.tdtuer.eventing_organizer.data.network.model.BookTicketRequest
import com.tdtuer.eventing_organizer.data.network.model.CreatePaymentOrderRequest
import com.tdtuer.eventing_organizer.data.network.model.CreatePaymentOrderResponse
import com.tdtuer.eventing_organizer.data.network.model.UserTicketDto
import com.tdtuer.eventing_organizer.domain.model.DetailedTicket
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.model.Ticket
import com.tdtuer.eventing_organizer.domain.model.failure
import com.tdtuer.eventing_organizer.domain.model.success
import com.tdtuer.eventing_organizer.helpers.generateBarCodeBitmap
import com.tdtuer.eventing_organizer.helpers.generateQrCodeBitmap
import com.tdtuer.eventing_organizer.ui.model.SaveRequest
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
    @ApplicationContext private val context: Context, // (1) Inject Context
    private val apiService: EventApiService // (2) Inject ApiService
) : TicketRepository { // (3) Implement interface TicketRepository đã hợp nhất

    // --- CÁC HÀM ĐÃ DI CHUYỂN TỪ EVENTREPOSITORYIMPL ---
    override suspend fun bookTicket(
        eventId: String,
        ticketType: String,
        promoCode: String?
    ): Result<Ticket> {
        return try {
            val request = BookTicketRequest(
                eventId = eventId,
                ticketType = ticketType,
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

    override suspend fun getTicketDetails(ticketId: String): Result<DetailedTicket> {
        return try {
            val response = apiService.getTicketDetails(ticketId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.toDomainModel())
            } else {
                Result.failure(Exception("Không thể tải chi tiết vé (Code: ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * HÀM MỚI: Nhận yêu cầu, tạo 2 ảnh template và lưu
     */
    override suspend fun saveTicketImages(request: SaveRequest): Result<Unit> {
        return try {
            // Logic nghiệp vụ: Quyết định tên file
            val safeName = request.eventName.replace(Regex("[^A-Za-z0-9]"), "_")
            val ticketIdShort = request.ticketId.takeLast(6)

            // 1. TẠO VÀ LƯU ẢNH QR
            val qrBitmap = generateQrCodeBitmap(request.qrCodeData)
            val qrTemplate = createTicketTemplate(context, request, qrBitmap, true)
            saveImageBitmapToMediaStore(context, qrTemplate, "${safeName}_${ticketIdShort}_QR.png")

            // 2. TẠO VÀ LƯU ẢNH BARCODE
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

    /**
     * HÀM TẠO TEMPLATE:
     * Vẽ chữ và mã code lên một Bitmap mới.
     */
    private fun createTicketTemplate(
        context: Context,
        request: SaveRequest,
        codeBitmap: Bitmap,
        isQrCode: Boolean
    ): Bitmap {
        // Cấu hình kích thước ảnh
        val templateWidth = 800
        val templateHeight = if (isQrCode) 1000 else 650
        val padding = 40f

        // Tải font Poppins (đảm bảo bạn có R.font.poppins_bold và poppins_regular)
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

        // Cấu hình các loại Paint (cọ vẽ)
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

        // Bắt đầu vẽ
        val finalBitmap =
            Bitmap.createBitmap(templateWidth, templateHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(finalBitmap)

        // 1. Vẽ nền trắng
        canvas.drawRect(0f, 0f, templateWidth.toFloat(), templateHeight.toFloat(), whiteBgPaint)

        // 2. Vẽ thông tin (Tên sự kiện)
        canvas.drawText(request.eventName, padding, padding + 40f, titlePaint)

        // 3. Vẽ thông tin (Mã vé)
        canvas.drawText("Ticket ID:", padding, padding + 120f, labelPaint)
        canvas.drawText(request.ticketId, padding, padding + 160f, dataPaint)

        // 4. Vẽ mã code (Barcode hoặc QR)
        val codeTop = padding + 220f
        val codeWidth = (templateWidth - padding * 2)
        val codeHeight = if (isQrCode) codeWidth else 200f // Barcode thấp hơn

        val scaledCode =
            Bitmap.createScaledBitmap(codeBitmap, codeWidth.toInt(), codeHeight.toInt(), false)
        canvas.drawBitmap(scaledCode, padding, codeTop, null)

        // 5. Thêm logo hoặc text "Mobile Eventing" ở dưới
        canvas.drawText(
            "Generated by Mobile Eventing",
            padding,
            templateHeight - padding,
            labelPaint
        )

        return finalBitmap
    }


    /**
     * Hàm private (riêng tư) chứa logic lưu file vào MediaStore.
     * Nó chạy trên IO Dispatcher.
     */
    private suspend fun saveImageBitmapToMediaStore(
        context: Context,
        bitmap: Bitmap, // <-- SỬA: Nhận android.graphics.Bitmap
        fileName: String
    ) {
        // KHÔNG CẦN CONVERT (vì đã là Bitmap)
        // val bitmap = imageBitmap.asAndroidBitmap()

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
                throw e // Ném lỗi để Result.failure bắt
            }
        }
    }

    override suspend fun getUserTickets(page: Int, limit: Int): Flow<Result<List<UserTicketDto>>> =
        flow {
            emit(Result.Loading)
            try {
                val response = apiService.getUserTickets(page, limit)
                if (response.isSuccessful && response.body() != null) {
                    emit(Result.success(response.body()!!.tickets))
                } else {
                    emit(Result.failure(Exception("Lỗi: ${response.code()} ${response.message()}")))
                }
            } catch (e: Exception) {
                emit(Result.failure(e))
            }
        }
}