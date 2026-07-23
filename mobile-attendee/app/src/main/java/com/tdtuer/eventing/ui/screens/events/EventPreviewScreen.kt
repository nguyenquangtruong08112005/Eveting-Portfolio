package com.tdtuer.eventing.ui.screens.events

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
//import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.hilt.navigation.compose.hiltViewModel // Sửa lại import
import androidx.navigation.NavController // Sửa lại import
import androidx.navigation.compose.rememberNavController
import coil.compose.AsyncImage // Dùng AsyncImage để tải ảnh từ URL
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.Event // Import Domain Model
import com.tdtuer.eventing.helpers.formatTimestampToDay // Import helper
import com.tdtuer.eventing.helpers.formatTimestampToMonth // Import helper
import com.tdtuer.eventing.helpers.formatTimestampToYear
import com.tdtuer.eventing.ui.components.FacePile
import com.tdtuer.eventing.ui.theme.EventingTheme

@Composable
fun EventPreviewScreen(
    viewModel: EventPreviewViewModel = hiltViewModel(), // Dùng Hilt
    navController: NavController
) {
    val uiState by viewModel.uiState.collectAsState()

    Box(modifier = Modifier.fillMaxSize()) {
        when {
            // 1. Trạng thái Loading
            uiState.isLoading -> {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }

            // 2. Trạng thái Error
            uiState.error != null -> {
                Text(
                    text = "Error: ${uiState.error}",
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(16.dp)
                )
            }

            // 3. Trạng thái Success
            uiState.event != null -> {
                val event = uiState.event!!
                EventPreviewContent(
                    event = event,
                    viewModel = viewModel,
                    navController = navController
                )
            }
        }
    }
}

@Composable
private fun EventPreviewContent(
    event: Event,
    viewModel: EventPreviewViewModel,
    navController: NavController
) {
    // 1. Background Image (Dùng AsyncImage)
    AsyncImage(
        model = event.imageUrl.ifEmpty { R.drawable.group_34057 }, // Dùng bannerUrl từ API
        contentDescription = "Event Background",
        modifier = Modifier.fillMaxSize(),
        contentScale = ContentScale.Crop,
        placeholder = painterResource(id = R.drawable.group_34057)
    )

    // 2. Gradient Overlay (Giữ nguyên)
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.8f)),
                    startY = 600f
                )
            )
    )

    // 3. Top Action Icons
    TopActionButtons(
        onBackClick = { viewModel.onBackClick(navController) }, // Truyền navController
        onFavoriteClick = { viewModel.onFavoriteClick() }
    )

    // 4. Main Content
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.Bottom,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = event.name, // Dùng event.name
            color = Color.White,
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            lineHeight = 40.sp
        )
        Spacer(modifier = Modifier.height(24.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Location part
            Row(
                modifier = Modifier.weight(1f), // Takes up available space
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = "Location",
                    tint = Color.White,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "${event.venueName}, ${event.city}",
                    color = Color.White,
                    fontSize = MaterialTheme.typography.bodySmall.fontSize,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Date part
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.CalendarToday,
                    contentDescription = "Date",
                    tint = Color.White,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                // Dùng helper để định dạng timestamp
                val dateString = buildString {
                    append(formatTimestampToDay(event.date))
                    event.endDate?.let {
                        if (it > 0) {
                            append(" - ${formatTimestampToDay(it)}")
                        }
                    }
                    append(" ${formatTimestampToMonth(event.date)}, ${formatTimestampToYear(event.date)}")
                }
                Text(
                    text = dateString,
                    color = Color.White,
                    fontSize = MaterialTheme.typography.bodySmall.fontSize,
                    maxLines = 1
                )
            }
        }
        Spacer(modifier = Modifier.height(24.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // TODO: FacePile cần lấy dữ liệu thật (hiện đang dùng dummy)
            FacePile(avatars = listOf(R.drawable.default_pfp, R.drawable.default_pfp))
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "${event.viewCount}+ Members are joined", // Dùng event.viewCount
                color = Color.White,
                fontSize = MaterialTheme.typography.bodySmall.fontSize
            )
        }
        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick = { viewModel.onContinue(navController, event.id) }, // Truyền event.id
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = MaterialTheme.shapes.medium,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFFF57C00)
            )
        ) {
            Text(
                text = "Continue",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = Color.White
            )
        }
    }
}

@Composable
private fun TopActionButtons(onBackClick: () -> Unit, onFavoriteClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 48.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(
            onClick = onBackClick,
            modifier = Modifier
                .size(40.dp)
                .background(Color.Black.copy(alpha = 0.3f), CircleShape)
        ) {
            Icon(
                Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = Color.White
            )
        }
        IconButton(
            onClick = onFavoriteClick,
            modifier = Modifier
                .size(40.dp)
                .background(Color.Black.copy(alpha = 0.3f), CircleShape)
        ) {
            Icon(Icons.Default.Bookmark, contentDescription = "Favorite", tint = Color(0xFFF44336))
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun EventPreviewScreenPreview() {
    EventingTheme {
        EventPreviewScreen(
            viewModel = androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel(),
            navController = rememberNavController()
        )
    }
}