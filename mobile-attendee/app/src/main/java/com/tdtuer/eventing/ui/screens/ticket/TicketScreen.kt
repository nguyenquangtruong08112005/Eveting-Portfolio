package com.tdtuer.eventing.ui.screens.ticket

import TicketShape // <-- (1) Import TicketShape dùng chung
import android.widget.Toast
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import coil.compose.AsyncImage
import com.tdtuer.eventing.domain.model.DetailedTicket
import com.tdtuer.eventing.helpers.formatTimestampToDay
import com.tdtuer.eventing.helpers.formatTimestampToMonth
import com.tdtuer.eventing.helpers.generateQrCodeBitmap
import com.tdtuer.eventing.ui.components.GradientHeader
import com.tdtuer.eventing.ui.theme.AppTheme
import com.tdtuer.eventing.ui.theme.EventingTheme
import com.tdtuer.eventing.R
import com.tdtuer.eventing.helpers.formatTimestampToHour
import com.tdtuer.eventing.helpers.formatTimestampToMinute
import com.tdtuer.eventing.helpers.formatTimestampToYear
import com.tdtuer.eventing.helpers.generateBarCodeBitmap

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TicketScreen(
    viewModel: TicketViewModel = hiltViewModel(),
    navController: NavHostController
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(uiState) {
        val toastMessage = when (val state = uiState) {
            is TicketUiState.Success -> state.toastMessage
            is TicketUiState.Error -> state.toastMessage
            else -> null
        }

        if (toastMessage != null) {
            Toast.makeText(context, toastMessage, Toast.LENGTH_SHORT).show()
            viewModel.onToastShown() // (3) Reset toast
        }
    }

    Scaffold(
        // (Giữ nguyên TopAppBar trong suốt của bạn)
        topBar = {
            TopAppBar(
                title = { Text("Tickets", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackClick() }) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.onCartClick() }) {
                        Icon(
                            Icons.Default.ShoppingCart,
                            contentDescription = "Cart",
                            tint = Color.White
                        )
                    }
                    IconButton(onClick = { viewModel.onMoreOptionsClick() }) {
                        Icon(
                            Icons.Default.MoreVert,
                            contentDescription = "More",
                            tint = Color.White
                        )
                    }
                }, colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent,
                    titleContentColor = Color.White
                )
            )
        },
        bottomBar = {
            Button(
                onClick = { viewModel.onDownloadClick() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .height(56.dp),
                shape = MaterialTheme.shapes.medium,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF212121))
            ) {
                Icon(Icons.Default.Download, contentDescription = "Download")
                Spacer(modifier = Modifier.width(8.dp))
                Text("DOWNLOAD IMAGE", fontWeight = FontWeight.Bold)
            }
        },
        // (Xóa containerColor của Scaffold để Box nền cam đảm nhận)
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .background(
                    brush = AppTheme.extendedColors.orangeLinear // <-- Giữ nguyên nền cam của bạn
                )
                .padding(innerPadding)
                .padding(24.dp)
                .fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            // (Logic when (state) của bạn)
            when (val state = uiState) {
                is TicketUiState.Loading -> {
                    CircularProgressIndicator(color = Color.White)
                }

                is TicketUiState.Error -> {
                    Text(
                        text = state.message,
                        color = MaterialTheme.colorScheme.onError, // Nổi bật trên nền cam
                        textAlign = TextAlign.Center
                    )
                }

                is TicketUiState.Success -> {
                    // (Sửa: Dùng generateBarCodeBitmap như trong file của bạn)
                    val barCodeBitmap = remember(state.ticket.qrCode) {
                        generateBarCodeBitmap(state.ticket.qrCode).asImageBitmap()
                    }
                    Ticket(
                        details = state.ticket,
                        barCodeImage = barCodeBitmap // (Đổi tên cho rõ nghĩa)
                    )
                }
            }
        }

        // (GradientHeader của bạn)
        GradientHeader()
    }
}

// --- Custom Composables for this Screen ---

@Composable
private fun Ticket(
    details: DetailedTicket,
    barCodeImage: ImageBitmap
) { // <-- (1) barCodeImage VẪN LÀ ImageBitmap
    val density = LocalDensity.current

    val cornerRadius = 24.dp
    val cutoutRadius = 12.dp
    val junctionY = 200.dp

    val dashStrokeWidth = 10f
    val dashColor = Color.LightGray
    val dashWidth = 10f
    val dashGap = 10f
    val pathEffect = PathEffect.dashPathEffect(floatArrayOf(dashWidth, dashGap), 0f)

    val ticketShape = remember(cornerRadius, cutoutRadius, junctionY) {
        TicketShape(cornerRadius, cutoutRadius, junctionY)
    }

    // --- Bắt đầu thay đổi logic animation ---

    // (1) THAY ĐỔI: Dùng Float để lưu trữ góc xoay
    // Thay vì Boolean, chúng ta dùng Float để cộng dồn góc
    var rotationAngle by remember { mutableStateOf(0f) }

    // (2) THAY ĐỔI: Animate đến giá trị `rotationAngle`
    val rotationY by animateFloatAsState(
        targetValue = rotationAngle, // <-- Sửa: Dùng state góc xoay
        animationSpec = tween(
            durationMillis = 800, // Thời gian animation
            easing = FastOutSlowInEasing // Kiểu chuyển động
        ), label = "flip_animation"
    )

    // Tạo mã QR (giữ nguyên)
    val qrCodeBitmap = remember(details.qrCode) {
        generateQrCodeBitmap(details.qrCode).asImageBitmap()
    }

    // (3) THAY ĐỔI: Click sẽ CỘNG DỒN góc xoay
    val flipModifier = Modifier
        .fillMaxWidth()
        .clickable { rotationAngle += 180f } // <-- Sửa: Cộng 180 độ mỗi lần click
        .graphicsLayer {
            this.rotationY = rotationY
            cameraDistance = 8 * density.density
        }

    Box(
        modifier = flipModifier // Áp dụng modifier animation vào Box chính
    ) {
        // LỚP 1: CARD (NỘI DUNG CHÍNH)
        Card(
            shape = ticketShape,
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
        ) {

            // (4) THAY ĐỔI: Logic hiển thị nội dung
            // Chúng ta cần tính toán xem mặt nào đang hiển thị
            // dựa trên góc xoay (đã chuẩn hóa về 0-360 độ)
            val normalizedRotation = rotationY % 360
            // Mặt trước hiển thị khi góc từ 0-90 VÀ 270-360
            val isFrontVisible = normalizedRotation <= 90f || normalizedRotation > 270f

            if (isFrontVisible) { // Mặt trước
                Column {
                    Box(modifier = Modifier.height(junctionY)) {
                        AsyncImage(
                            model = details.eventBannerUrl,
                            contentDescription = "Event Image",
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(
                                    RoundedCornerShape(
                                        topStart = cornerRadius,
                                        topEnd = cornerRadius
                                    )
                                ),
                            contentScale = ContentScale.Crop,
                            placeholder = painterResource(id = R.drawable.ic_launcher_background)
                        )
                    }

                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            details.eventName,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            color = Color.Black
                        )
                        Spacer(modifier = Modifier.height(24.dp))

                        Spacer(modifier = Modifier.height(cutoutRadius * 2))

                        val day = formatTimestampToDay(details.eventDate)
                        val month = formatTimestampToMonth(details.eventDate)
                        val year = formatTimestampToYear(details.eventDate)
                        val hour = formatTimestampToHour(details.eventDate)
                        val minute = formatTimestampToMinute(details.eventDate)
                        val timeString = "$hour:$minute"

                        Row(modifier = Modifier.fillMaxWidth()) {
                            TicketInfo("Date", "$day $month $year", Modifier.weight(1f))
                            TicketInfo("Time", timeString, Modifier.weight(1f))
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(modifier = Modifier.fillMaxWidth()) {
                            TicketInfo("Venue", details.venueName, Modifier.weight(1f))
                            TicketInfo("Seat", details.ticketType, Modifier.weight(1f))
                        }
                        Spacer(modifier = Modifier.height(24.dp))

                        Image(
                            bitmap = barCodeImage,
                            contentDescription = "Barcode",
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(60.dp)
                                .padding(horizontal = 16.dp),
                            contentScale = ContentScale.FillWidth
                        )
                    }
                }
            } else { // Mặt sau (QR Code)
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            // (Sửa lỗi "this." từ trước)
                            this.rotationY = 180f // Xoay ngược lại để hiển thị đúng
                        },
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(modifier = Modifier.height(junctionY)) {
                        AsyncImage(
                            model = details.eventBannerUrl, // Dùng cùng banner
                            contentDescription = "Event Image",
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(
                                    RoundedCornerShape(
                                        topStart = cornerRadius,
                                        topEnd = cornerRadius
                                    )
                                ),
                            contentScale = ContentScale.Crop,
                            placeholder = painterResource(id = R.drawable.ic_launcher_background)
                        )

                        // (TÁI SỬ DỤNG ĐƯỜNG KẺ)
                        Canvas(modifier = Modifier.matchParentSize()) {
                            val cutoutRadiusPx = with(density) { cutoutRadius.toPx() }
                            val junctionYPx = with(density) { junctionY.toPx() }
                            drawLine(
                                color = dashColor,
                                start = Offset(x = cutoutRadiusPx, y = junctionYPx),
                                end = Offset(x = size.width - cutoutRadiusPx, y = junctionYPx),
                                strokeWidth = dashStrokeWidth,
                                pathEffect = pathEffect
                            )
                        }
                    }

                    // (PHẦN QR CODE)
                    Column(
                        modifier = Modifier
                            .fillMaxSize() // Lấp đầy phần còn lại
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center, // Căn giữa
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "Scan QR Code for Entry",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = Color.Black,
                            modifier = Modifier.padding(bottom = 24.dp)
                        )
                        Image(
                            bitmap = qrCodeBitmap,
                            contentDescription = "QR Code",
                            modifier = Modifier
                                .size(350.dp) // Kích thước cố định
                                .padding(horizontal = 16.dp),
                            contentScale = ContentScale.Fit
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        Text(
                            details.id, // Hiển thị ID vé
                            fontSize = 14.sp,
                            color = Color.Gray
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TicketInfo(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Text(label, fontSize = 12.sp, color = Color.Gray)
        Text(value, fontSize = 16.sp, fontWeight = FontWeight.Medium, color = Color.Black)
    }
}


@Preview(showSystemUi = true)
@Composable
fun TicketScreenPreview() {
    EventingTheme {
        TicketScreen(
            viewModel = viewModel(),
            navController = rememberNavController()
        )
    }
}