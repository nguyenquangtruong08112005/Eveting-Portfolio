package com.tdtuer.eventing.helpers

import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.Color
import android.graphics.Bitmap
import com.google.zxing.BarcodeFormat
import com.google.zxing.oned.Code128Writer
import com.google.zxing.qrcode.QRCodeWriter

/** * Chuyển đổi một chuỗi văn bản thành hình ảnh QR Code (Bitmap). */
fun generateQrCodeBitmap(text: String, width: Int = 512, height: Int = 512): ImageBitmap {
    val writer = QRCodeWriter()
    val bitMatrix = writer.encode(text, BarcodeFormat.QR_CODE, width, height)
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
    for (x in 0 until width) {
        for (y in 0 until height) {
            bitmap.setPixel(
                x, y, if (bitMatrix[x, y]) Color.Black.hashCode() else Color.White.hashCode()
            )
        }
    }
    return bitmap.asImageBitmap()
}

/** * Chuyển đổi một chuỗi thành bar code (Bitmap) */
fun generateBarCodeBitmap(text: String, width: Int = 512, height: Int = 128): ImageBitmap {
    val writer = Code128Writer()
    val bitMatrix = writer.encode(text, BarcodeFormat.CODE_128, width, height)
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
    for (x in 0 until width) {
        for (y in 0 until height) {
            bitmap.setPixel(
                x, y, if (bitMatrix[x, y]) Color.Black.hashCode() else Color.White.hashCode()
            )
        }
    }
    return bitmap.asImageBitmap()
}