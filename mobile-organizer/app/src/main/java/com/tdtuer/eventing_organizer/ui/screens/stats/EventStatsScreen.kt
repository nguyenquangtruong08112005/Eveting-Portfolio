package com.tdtuer.eventing_organizer.ui.screens.stats

import android.graphics.Color as AndroidColor
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.github.mikephil.charting.charts.BarChart
import com.github.mikephil.charting.components.XAxis
import com.github.mikephil.charting.data.BarData
import com.github.mikephil.charting.data.BarDataSet
import com.github.mikephil.charting.data.BarEntry
import com.github.mikephil.charting.formatter.IndexAxisValueFormatter
import com.tdtuer.eventing_organizer.data.network.model.TimeSeriesData
import com.tdtuer.eventing_organizer.ui.theme.AppTheme
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventStatsScreen(
    navController: NavController,
    viewModel: EventStatsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Thống kê sự kiện") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (uiState.stats != null) {
            val stats = uiState.stats!!
            Column(
                modifier = Modifier
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // 1. Tổng quan
                Text("Tổng quan", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatCard(
                        title = "Doanh thu",
                        value = formatCurrency(stats.totalRevenue),
                        icon = Icons.Default.AttachMoney,
                        color = Color(0xFF4CAF50),
                        modifier = Modifier.weight(1f)
                    )
                    StatCard(
                        title = "Vé bán ra",
                        value = "${stats.ticketsSold?.values?.sum() ?: 0}",
                        icon = Icons.Default.ConfirmationNumber,
                        color = Color(0xFF2196F3),
                        modifier = Modifier.weight(1f)
                    )
                }
                StatCard(
                    title = "Lượt xem / Check-in",
                    value = "${stats.views} / ${stats.checkIns}",
                    icon = Icons.Default.Visibility,
                    color = Color(0xFFFF9800),
                    modifier = Modifier.fillMaxWidth()
                )

                // 2. Phân tích loại vé (Ticket Types)
                Text("Loại vé được ưa chuộng", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(2.dp)
                ) {
                    Column(Modifier.padding(16.dp)) {
                        val total = stats.ticketsSold?.values?.sum()?.toFloat() ?: 1f
                        stats.ticketsSold?.forEach { (type, count) ->
                            val percent = if (total > 0) count / total else 0f
                            TicketTypeProgress(name = type, count = count, percent = percent)
                            Spacer(Modifier.height(12.dp))
                        }
                        if (stats.ticketsSold.isNullOrEmpty()) {
                            Text("Chưa có dữ liệu bán vé.", color = Color.Gray)
                        }
                    }
                }

                // 3. Biểu đồ bán theo thời gian (Sales Over Time)
                Text("Xu hướng bán vé", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(2.dp),
                    modifier = Modifier.height(300.dp).fillMaxWidth()
                ) {
                    Box(Modifier.padding(16.dp), contentAlignment = Alignment.Center) {
                        // SỬA: Dùng chartData (dữ liệu thật)
                        if (uiState.chartData.isNotEmpty()) {
                            MPAndroidBarChart(data = uiState.chartData)
                        } else {
                            Text("Chưa có dữ liệu bán hàng theo ngày.", color = Color.Gray)
                        }
                    }
                }
            }
        } else if (uiState.error != null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Lỗi: ${uiState.error}", color = Color.Red)
            }
        }
    }
}

@Composable
fun StatCard(title: String, value: String, icon: ImageVector, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(icon, null, tint = color)
            Text(value, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text(title, fontSize = 12.sp, color = Color.Gray)
        }
    }
}

@Composable
fun TicketTypeProgress(name: String, count: Int, percent: Float) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(name, fontWeight = FontWeight.Medium)
            Text("$count vé (${(percent * 100).toInt()}%)", color = Color.Gray, fontSize = 12.sp)
        }
        Spacer(Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { percent },
            modifier = Modifier.fillMaxWidth().height(8.dp).background(Color(0xFFEEEEEE), RoundedCornerShape(4.dp)),
            color = AppTheme.colorScheme.primary,
        )
    }
}

@Composable
fun MPAndroidBarChart(data: List<TimeSeriesData>) {
    val barColor = AppTheme.colorScheme.primary.toArgb()
    val dateFormatter = remember { SimpleDateFormat("dd/MM", Locale.getDefault()) }

    val xLabels = remember(data) {
        data.map { dateFormatter.format(Date(it.timestamp)) }
    }

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { context ->
            BarChart(context).apply {
                description.isEnabled = false
                legend.isEnabled = false
                setDrawGridBackground(false)
                setFitBars(true)

                xAxis.apply {
                    position = XAxis.XAxisPosition.BOTTOM
                    setDrawGridLines(false)
                    granularity = 1f
                    textColor = AndroidColor.DKGRAY
                    valueFormatter = IndexAxisValueFormatter(xLabels)
                }

                axisLeft.apply {
                    setDrawGridLines(true)
                    axisMinimum = 0f
                    textColor = AndroidColor.DKGRAY
                    granularity = 1f
                }
                axisRight.isEnabled = false

                animateY(1000)
            }
        },
        update = { chart ->
            val entries = data.mapIndexed { index, item ->
                BarEntry(index.toFloat(), item.value.toFloat())
            }

            val dataSet = BarDataSet(entries, "Vé bán").apply {
                color = barColor
                valueTextColor = AndroidColor.BLACK
                valueTextSize = 12f
                setDrawValues(true)
            }

            val barData = BarData(dataSet)
            barData.barWidth = 0.5f

            chart.data = barData

            // Quan trọng: Cập nhật lại formatter khi data thay đổi
            chart.xAxis.valueFormatter = IndexAxisValueFormatter(data.map {
                dateFormatter.format(Date(it.timestamp))
            })

            chart.invalidate()
        }
    )
}

fun formatCurrency(amount: Double): String {
    return try {
        val format = NumberFormat.getCurrencyInstance(Locale("vi", "VN"))
        format.format(amount)
    } catch (e: Exception) {
        "$amount"
    }
}