package com.tdtuer.eventing.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.tdtuer.eventing.domain.model.Weather
import com.tdtuer.eventing.ui.theme.AppTheme

@Composable
fun WeatherInfoCard(weather: Weather) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFE3F2FD) // Màu xanh dương nhạt (hoặc dùng AppTheme)
        ),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = "Outdoor Forecast",
                    style = MaterialTheme.typography.labelMedium,
                    color = Color(0xFF1565C0)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        text = "${weather.temperature}°",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0D47A1)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = weather.description,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF1976D2),
                        modifier = Modifier.padding(bottom = 6.dp)
                    )
                }
            }

            AsyncImage(
                model = weather.iconUrl, // URL icon từ API
                contentDescription = "Weather Icon",
                modifier = Modifier.size(64.dp),
                contentScale = ContentScale.Fit
            )
        }
    }
}