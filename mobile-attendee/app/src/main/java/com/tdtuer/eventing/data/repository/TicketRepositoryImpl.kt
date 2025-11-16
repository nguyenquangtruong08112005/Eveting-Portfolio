package com.tdtuer.eventing.data.repository

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import com.tdtuer.eventing.data.mapper.toDomainModel
import com.tdtuer.eventing.data.network.EventApiService
import com.tdtuer.eventing.data.network.model.BookTicketRequest
import com.tdtuer.eventing.data.network.model.CreatePaymentOrderRequest
import com.tdtuer.eventing.data.network.model.CreatePaymentOrderResponse
import com.tdtuer.eventing.domain.model.DetailedTicket
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Ticket
import com.tdtuer.eventing.domain.model.failure
import com.tdtuer.eventing.domain.model.success
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.OutputStream
import javax.inject.Inject
import javax.inject.Singleton

// LỖI REDECLARATION ĐÃ ĐƯỢC XÓA (Không có interface ở đây)

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

    // --- HÀM LƯU ẢNH (ĐÃ HOÀN CHỈNH) ---
    override suspend fun saveImageToGallery(imageBitmap: ImageBitmap, fileName: String): Result<Unit> {
        return try {
            saveImageBitmapToMediaStore(context, imageBitmap, fileName)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun saveImageBitmapToMediaStore(
        context: Context,
        imageBitmap: ImageBitmap,
        fileName: String
    ) {
        val bitmap = imageBitmap.asAndroidBitmap()

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
                    put(MediaStore.Images.Media.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/Eventing")
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
}