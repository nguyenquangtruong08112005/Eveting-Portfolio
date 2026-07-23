package com.tdtuer.eventing_organizer.ui.screens.scanner

import android.annotation.SuppressLint
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage

class QrCodeAnalyzer(
    private val onQrCodeScanned: (String) -> Unit
) : ImageAnalysis.Analyzer {

    private val scanner = BarcodeScanning.getClient(
        BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .build()
    )

    // Biến để tránh quét liên tục cùng 1 mã (debounce)
    private var lastScannedTime = 0L
    private val SCAN_DELAY = 3000L // 3 giây mới được quét lại

    @SuppressLint("UnsafeOptInUsageError")
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    if (barcodes.isNotEmpty()) {
                        val currentTime = System.currentTimeMillis()
                        if (currentTime - lastScannedTime >= SCAN_DELAY) {
                            barcodes.first().rawValue?.let { code ->
                                onQrCodeScanned(code)
                                lastScannedTime = currentTime
                            }
                        }
                    }
                }
                .addOnFailureListener {
                    // Log error
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }
}