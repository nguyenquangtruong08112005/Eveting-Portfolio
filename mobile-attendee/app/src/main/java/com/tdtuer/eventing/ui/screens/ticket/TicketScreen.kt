package com.tdtuer.eventing.ui.screens.ticket

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.R // Note: Add your drawable resources
import com.tdtuer.eventing.ui.theme.EventingTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TicketScreen(viewModel: TicketViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tickets", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackClick() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.onCartClick() }) {
                        Icon(Icons.Default.ShoppingCart, contentDescription = "Cart")
                    }
                    IconButton(onClick = { viewModel.onMoreOptionsClick() }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More")
                    }
                }
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
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .padding(innerPadding)
                .padding(24.dp)
                .fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Ticket(details = uiState.ticketDetails)
        }
    }
}

// --- Custom Composables for this Screen ---

@Composable
private fun Ticket(details: TicketDetails) {
    val ticketShape = TicketShape(cornerRadius = 24.dp, cutoutRadius = 12.dp)
    Card(
        shape = ticketShape,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary),
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Image(
                painter = painterResource(id = details.eventImageRes),
                contentDescription = "Event Image",
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(MaterialTheme.shapes.large),
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                shape = ticketShape,
                colors = CardDefaults.cardColors(containerColor = Color.White),
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(details.title, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color.Black)
                    Spacer(modifier = Modifier.height(24.dp))

                    DashedDividerWithCutouts(cutoutRadius = 12.dp)

                    Spacer(modifier = Modifier.height(24.dp))

                    Row(modifier = Modifier.fillMaxWidth()) {
                        TicketInfo("Date", details.date, Modifier.weight(1f))
                        TicketInfo("Time", details.time, Modifier.weight(1f))
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(modifier = Modifier.fillMaxWidth()) {
                        TicketInfo("Venue", details.venue, Modifier.weight(1f))
                        TicketInfo("Seat", details.seat, Modifier.weight(1f))
                    }
                    Spacer(modifier = Modifier.height(24.dp))

                    Image(
                        painter = painterResource(id = details.barcodeImageRes),
                        contentDescription = "Barcode",
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(60.dp),
                        contentScale = ContentScale.FillWidth
                    )
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

@Composable
private fun DashedDividerWithCutouts(cutoutRadius: Dp) {
    val density = LocalDensity.current
    val cutoutRadiusPx = with(density) { cutoutRadius.toPx() }
    val stroke = Stroke(width = 2f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f))

    Canvas(modifier = Modifier
        .fillMaxWidth()
        .height(cutoutRadius * 2)) {
        val y = center.y
        drawCircle(Color.LightGray, radius = cutoutRadiusPx, center = Offset(0f, y), style = stroke)
        drawCircle(Color.LightGray, radius = cutoutRadiusPx, center = Offset(size.width, y), style = stroke)
        drawLine(Color.LightGray, start = Offset(cutoutRadiusPx, y), end = Offset(size.width - cutoutRadiusPx, y), strokeWidth = 2f, pathEffect = stroke.pathEffect)
    }
}

// CORRECTED custom shape class for the ticket stub effect
class TicketShape(private val cornerRadius: Dp, private val cutoutRadius: Dp) : Shape {
    override fun createOutline(
        size: Size,
        layoutDirection: LayoutDirection,
        density: Density
    ): Outline {
        val path = Path().apply {
            with(density) {
                val cornerRadiusPx = cornerRadius.toPx()
                val cutoutRadiusPx = cutoutRadius.toPx()
                // Position the cutout a bit lower than center for a more realistic look
                val cutoutY = size.height * 0.6f

                // Define the rectangles for the corner arcs
                val topLeftRect = Rect(0f, 0f, 2 * cornerRadiusPx, 2 * cornerRadiusPx)
                val topRightRect = Rect(size.width - 2 * cornerRadiusPx, 0f, size.width, 2 * cornerRadiusPx)
                val bottomRightRect = Rect(size.width - 2 * cornerRadiusPx, size.height - 2 * cornerRadiusPx, size.width, size.height)
                val bottomLeftRect = Rect(0f, size.height - 2 * cornerRadiusPx, 2 * cornerRadiusPx, size.height)

                // Define the rectangles for the cutout arcs
                val rightCutoutRect = Rect(size.width - cutoutRadiusPx, cutoutY - cutoutRadiusPx, size.width + cutoutRadiusPx, cutoutY + cutoutRadiusPx)
                val leftCutoutRect = Rect(-cutoutRadiusPx, cutoutY - cutoutRadiusPx, cutoutRadiusPx, cutoutY + cutoutRadiusPx)

                // Build the path
                moveTo(0f, cornerRadiusPx)
                arcTo(topLeftRect, 180f, 90f, false)
                lineTo(size.width - cornerRadiusPx, 0f)
                arcTo(topRightRect, 270f, 90f, false)
                lineTo(size.width, cutoutY - cutoutRadiusPx)
                arcTo(rightCutoutRect, 270f, -180f, false)
                lineTo(size.width, size.height - cornerRadiusPx)
                arcTo(bottomRightRect, 0f, 90f, false)
                lineTo(cornerRadiusPx, size.height)
                arcTo(bottomLeftRect, 90f, 90f, false)
                lineTo(0f, cutoutY + cutoutRadiusPx)
                // FIX IS HERE: The sweep angle for the left cutout must be positive (180f)
                // to curve inwards correctly as the path moves upwards.
                arcTo(leftCutoutRect, 90f, 180f, false)
                close()
            }
        }
        return Outline.Generic(path)
    }
}


@Preview(showSystemUi = true)
@Composable
fun TicketScreenPreview() {
    EventingTheme {
        TicketScreen(viewModel = viewModel())
    }
}