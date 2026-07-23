package com.tdtuer.eventing_organizer.ui.screens.scanner

import android.Manifest
import android.util.Size // Size của Android cho Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
// Xóa import Size của Compose ở đây để tránh nhầm lẫn, dùng full path bên dưới
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.tdtuer.eventing_organizer.data.network.model.CheckInTicketInfo
import com.tdtuer.eventing_organizer.ui.theme.AppTheme
import java.util.concurrent.Executors

@OptIn(ExperimentalPermissionsApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ScannerScreen(
    navController: NavController,
    viewModel: ScannerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    val cameraPermissionState = rememberPermissionState(Manifest.permission.CAMERA)

    var hasFlash by remember { mutableStateOf(false) }
    var isFlashOn by remember { mutableStateOf(false) }
    var cameraControl: androidx.camera.core.CameraControl? by remember { mutableStateOf(null) }

    LaunchedEffect(Unit) {
        if (!cameraPermissionState.status.isGranted) {
            cameraPermissionState.launchPermissionRequest()
        }
    }

    // --- HIỂN THỊ DIALOG KẾT QUẢ ---
    if (uiState.showResultDialog) {
        CheckInResultDialog(
            status = uiState.scanStatus,
            ticketInfo = uiState.ticketInfo,
            message = uiState.message,
            onDismiss = { viewModel.dismissDialog() }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Quét Vé", color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                actions = {
                    if (hasFlash) {
                        IconButton(onClick = {
                            isFlashOn = !isFlashOn
                            cameraControl?.enableTorch(isFlashOn)
                        }) {
                            Icon(
                                imageVector = if (isFlashOn) Icons.Default.FlashOn else Icons.Default.FlashOff,
                                contentDescription = "Flash",
                                tint = if (isFlashOn) Color.Yellow else Color.White
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
            )
        },
        containerColor = Color.Black
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize()) {
            if (cameraPermissionState.status.isGranted) {
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { ctx ->
                        val previewView = PreviewView(ctx)
                        val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                        val executor = ContextCompat.getMainExecutor(ctx)

                        cameraProviderFuture.addListener({
                            val cameraProvider = cameraProviderFuture.get()
                            val preview = Preview.Builder().build().also {
                                it.setSurfaceProvider(previewView.surfaceProvider)
                            }

                            val imageAnalysis = ImageAnalysis.Builder()
                                // Size này là android.util.Size (đã import ở trên)
                                .setTargetResolution(Size(1280, 720))
                                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                .build()

                            imageAnalysis.setAnalyzer(
                                Executors.newSingleThreadExecutor(),
                                QrCodeAnalyzer { code ->
                                    viewModel.onQrCodeScanned(code)
                                }
                            )

                            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                            try {
                                cameraProvider.unbindAll()
                                val camera = cameraProvider.bindToLifecycle(
                                    lifecycleOwner,
                                    cameraSelector,
                                    preview,
                                    imageAnalysis
                                )
                                cameraControl = camera.cameraControl
                                hasFlash = camera.cameraInfo.hasFlashUnit()
                            } catch (exc: Exception) {
                                exc.printStackTrace()
                            }
                        }, executor)
                        previewView
                    }
                )

                // FIX LỖI COMPOSABLE INVOCATION:
                // Lấy màu theme ra biến trước khi vào Canvas
                val primaryColor = AppTheme.colorScheme.primary

                // Overlay Camera (Khung quét)
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val canvasWidth = size.width
                    val canvasHeight = size.height
                    val scanSize = 280.dp.toPx()
                    val left = (canvasWidth - scanSize) / 2
                    val top = (canvasHeight - scanSize) / 2

                    // Vẽ màn hình tối mờ xung quanh
                    drawRect(color = Color.Black.copy(alpha = 0.6f), size = size)

                    // Đục lỗ trong suốt ở giữa (BlendMode.Clear)
                    drawRoundRect(
                        color = Color.Transparent,
                        topLeft = Offset(left, top),
                        // Dùng full path để tránh conflict: androidx.compose.ui.geometry.Size
                        size = androidx.compose.ui.geometry.Size(scanSize, scanSize),
                        cornerRadius = CornerRadius(16.dp.toPx()),
                        blendMode = BlendMode.Clear
                    )

                    // Vẽ viền màu Primary (dùng biến đã lấy ở trên)
                    drawRoundRect(
                        color = primaryColor, // Sử dụng biến local, không gọi AppTheme... ở đây
                        topLeft = Offset(left, top),
                        size = androidx.compose.ui.geometry.Size(scanSize, scanSize),
                        cornerRadius = CornerRadius(16.dp.toPx()),
                        style = Stroke(width = 4.dp.toPx())
                    )
                }

                Text(
                    text = "Di chuyển mã QR vào khung",
                    color = Color.White,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 120.dp)
                )

                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = AppTheme.colorScheme.primary
                    )
                }
            } else {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Button(onClick = { cameraPermissionState.launchPermissionRequest() }) {
                        Text("Cấp quyền Camera")
                    }
                }
            }
        }
    }
}

// --- CUSTOM DIALOG ---

@Composable
fun CheckInResultDialog(
    status: ScanStatus,
    ticketInfo: CheckInTicketInfo?,
    message: String,
    onDismiss: () -> Unit
) {
    // Helper Tuple để gộp dữ liệu màu sắc
    data class StatusConfig(val bgColor: Color, val icon: androidx.compose.ui.graphics.vector.ImageVector, val title: String, val titleColor: Color)

    val config = when (status) {
        ScanStatus.SUCCESS -> StatusConfig(Color(0xFFE8F5E9), Icons.Default.CheckCircle, "Check-in Thành Công", Color(0xFF2E7D32)) // Xanh lá
        ScanStatus.WARNING -> StatusConfig(Color(0xFFFFF3E0), Icons.Default.Warning, "Cảnh Báo", Color(0xFFEF6C00)) // Cam (Đã dùng)
        else -> StatusConfig(Color(0xFFFFEBEE), Icons.Default.Error, "Check-in Thất Bại", Color(0xFFC62828)) // Đỏ (Lỗi)
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier.fillMaxWidth().padding(16.dp)
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(24.dp)
            ) {
                // 1. Icon tròn lớn
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(config.bgColor, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = config.icon,
                        contentDescription = null,
                        tint = config.titleColor,
                        modifier = Modifier.size(48.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 2. Tiêu đề
                Text(
                    text = config.title,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = config.titleColor
                )

                Spacer(modifier = Modifier.height(8.dp))

                // 3. Message (Lý do lỗi hoặc chi tiết)
                if (status != ScanStatus.SUCCESS) {
                    Text(
                        text = message,
                        textAlign = TextAlign.Center,
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                }

                // 4. Thông tin vé (Nếu có)
                if (ticketInfo != null) {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                    // Loại vé
                    TicketDetailRow("Loại vé", ticketInfo.ticketType)

                    // Ghế (Chỉ hiện nếu không null/rỗng)
                    if (!ticketInfo.seat.isNullOrBlank()) {
                        TicketDetailRow("Ghế", ticketInfo.seat)
                    }

                    // Thời gian (Nếu có timestamp)
                    // Có thể format timestamp ở đây nếu muốn

                    // Mã vé (ẩn bớt)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "ID: ...${ticketInfo.ticketId.takeLast(8)}",
                        fontSize = 12.sp,
                        color = Color.LightGray
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // 5. Button
                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = config.titleColor),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Tiếp tục quét", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun TicketDetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = Color.Gray)
        Text(value, fontWeight = FontWeight.Bold, color = Color.Black)
    }
}