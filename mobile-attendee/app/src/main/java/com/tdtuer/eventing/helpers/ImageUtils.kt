package com.tdtuer.eventing.helpers

import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import android.graphics.Bitmap // <-- SỬA: Dùng Bitmap của Android
import android.graphics.Color // <-- SỬA: Dùng Color của Android
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.oned.Code128Writer
import com.google.zxing.qrcode.QRCodeWriter
import java.util.EnumMap

/** * Chuyển đổi một chuỗi văn bản thành hình ảnh QR Code (Bitmap). */
fun generateQrCodeBitmap(text: String, width: Int = 512, height: Int = 512): Bitmap { // <-- SỬA KIỂU TRẢ VỀ
    val writer = QRCodeWriter()
    val hints = EnumMap<EncodeHintType, Any>(EncodeHintType::class.java).apply {
        put(EncodeHintType.CHARACTER_SET, "UTF-8")
        put(EncodeHintType.MARGIN, 1) // Bỏ viền trắng
    }
    val bitMatrix = writer.encode(text, BarcodeFormat.QR_CODE, width, height, hints)
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
    for (x in 0 until width) {
        for (y in 0 until height) {
            bitmap.setPixel(
                x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE // <-- SỬA (dùng Color.BLACK)
            )
        }
    }
    return bitmap // <-- SỬA: Trả về android.graphics.Bitmap
}

/** * Chuyển đổi một chuỗi thành bar code (Bitmap) */
fun generateBarCodeBitmap(text: String, width: Int = 512, height: Int = 128): Bitmap { // <-- SỬA KIỂU TRẢ VỀ
    val writer = Code128Writer()
    val bitMatrix = writer.encode(text, BarcodeFormat.CODE_128, width, height)
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
    for (x in 0 until width) {
        for (y in 0 until height) {
            bitmap.setPixel(
                x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE // <-- SỬA (dùng Color.BLACK)
            )
        }
    }
    return bitmap // <-- SỬA: Trả về android.graphics.Bitmap
}