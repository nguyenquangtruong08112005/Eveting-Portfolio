package com.tdtuer.eventing_organizer.ui.screens.admin

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.tdtuer.eventing_organizer.R
import com.tdtuer.eventing_organizer.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing_organizer.domain.model.Event
import com.tdtuer.eventing_organizer.helpers.*
import com.tdtuer.eventing_organizer.ui.theme.AppTheme
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AdminEventDetailScreen(
    navController: NavController,
    viewModel: AdminEventDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // State cho Dialog từ chối
    var showRejectDialog by remember { mutableStateOf(false) }
    var rejectReason by remember { mutableStateOf("") }

    LaunchedEffect(uiState.actionMessage, uiState.error, uiState.isActionSuccess) {
        uiState.actionMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearMessage()
        }
        uiState.error?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearMessage()
        }
        if (uiState.isActionSuccess) {
            navController.popBackStack()
        }
    }

    // Dialog Reject
    if (showRejectDialog) {
        AlertDialog(
            onDismissRequest = { showRejectDialog = false },
            title = { Text("Từ chối sự kiện", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Vui lòng nhập lý do từ chối để gửi cho Organizer:", fontSize = 14.sp, color = Color.Gray)
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = rejectReason,
                        onValueChange = { rejectReason = it },
                        label = { Text("Lý do") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.rejectEvent(rejectReason)
                        showRejectDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AppTheme.colorScheme.error)
                ) { Text("Xác nhận Từ chối") }
            },
            dismissButton = {
                TextButton(onClick = { showRejectDialog = false }) { Text("Hủy") }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Review Event Detail", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        bottomBar = {
            if (!uiState.isLoading && uiState.event != null) {
                Surface(shadowElevation = 16.dp, color = Color.White) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = { showRejectDialog = true },
                            modifier = Modifier.weight(1f).height(48.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = AppTheme.colorScheme.error),
                            border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(AppTheme.colorScheme.error))
                        ) {
                            Icon(Icons.Default.Close, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("REJECT")
                        }

                        Button(
                            onClick = { viewModel.approveEvent() },
                            modifier = Modifier.weight(1f).height(48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                        ) {
                            Icon(Icons.Default.Check, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("APPROVE")
                        }
                    }
                }
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize().background(Color(0xFFF9F9F9))) {
            if (uiState.isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (uiState.event != null) {
                val event = uiState.event!!

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                ) {
                    // --- 1. BANNER & IMAGES ---
                    Box(modifier = Modifier.height(250.dp).fillMaxWidth()) {
                        AsyncImage(
                            model = event.bannerUrl.ifEmpty { event.imageUrl },
                            contentDescription = null,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop,
                            placeholder = painterResource(R.drawable.ic_launcher_background)
                        )
                        // Status Badge
                        Surface(
                            modifier = Modifier.align(Alignment.TopEnd).padding(16.dp),
                            color = getStatusColor(event.status),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = event.status.uppercase(),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }

                    Column(modifier = Modifier.padding(16.dp)) {
                        // --- 2. BASIC INFO ---
                        Text(event.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(8.dp))

                        // Thời gian
                        DetailRow(Icons.Default.CalendarToday, "Start: ${formatFullDate(event.date)}")
                        if (event.endDate != null && event.endDate > 0) {
                            DetailRow(Icons.Default.Event, "End:   ${formatFullDate(event.endDate)}")
                        }

                        // Địa điểm
                        if (event.eventType == "online") {
                            DetailRow(Icons.Default.Public, "ONLINE EVENT")
                            if (event.onlineUrl.isNotEmpty()) {
                                DetailLinkRow(Icons.Default.Link, event.onlineUrl)
                            }
                        } else {
                            DetailRow(Icons.Default.LocationOn, "${event.venueName}, ${event.city}")
                            Text(event.location, fontSize = 13.sp, color = Color.Gray, modifier = Modifier.padding(start = 32.dp))
                        }

                        Spacer(Modifier.height(16.dp))
                        HorizontalDivider()
                        Spacer(Modifier.height(16.dp))

                        // --- 3. CATEGORIES & TAGS ---
                        Text("Taxonomy", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(Modifier.height(8.dp))

                        if (event.category.isNotEmpty()) {
                            Text("Categories:", fontSize = 12.sp, color = Color.Gray)
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                event.category.forEach { cat ->
                                    SuggestionChip(onClick = {}, label = { Text(cat) }, colors = SuggestionChipDefaults.suggestionChipColors(containerColor = Color.White))
                                }
                            }
                        }

                        if (event.tags.isNotEmpty()) {
                            Spacer(Modifier.height(8.dp))
                            Text("Tags:", fontSize = 12.sp, color = Color.Gray)
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                event.tags.forEach { tag ->
                                    Text("#$tag", color = AppTheme.colorScheme.primary, fontSize = 14.sp, modifier = Modifier.padding(vertical = 4.dp))
                                }
                            }
                        }

                        Spacer(Modifier.height(16.dp))
                        HorizontalDivider()
                        Spacer(Modifier.height(16.dp))

                        // --- 4. DESCRIPTION ---
                        Text("Description", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(Modifier.height(8.dp))
                        SelectionContainer {
                            Text(event.description, lineHeight = 22.sp, color = Color.DarkGray)
                        }

                        // Video URL if exists
                        if (event.videoUrl.isNotEmpty()) {
                            Spacer(Modifier.height(12.dp))
                            DetailLinkRow(Icons.Default.VideoLibrary, event.videoUrl, "Intro Video")
                        }

                        Spacer(Modifier.height(16.dp))
                        HorizontalDivider()
                        Spacer(Modifier.height(16.dp))

                        // --- 5. TICKET TYPES ---
                        Text("Tickets", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(Modifier.height(8.dp))
                        Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
                            Column(Modifier.padding(12.dp)) {
                                event.ticketTypes.forEach { (name, details) ->
                                    val price = (details["price"] as? Number)?.toDouble() ?: 0.0
                                    val qty = (details["quantity"] as? Number)?.toInt() ?: 0
                                    val available = (details["available"] as? Number)?.toInt() ?: 0

                                    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Column {
                                            Text(name, fontWeight = FontWeight.Bold)
                                            Text("Qty: $qty | Avail: $available", fontSize = 12.sp, color = Color.Gray)
                                        }
                                        Text(formatVNCurrency(price), color = AppTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                    }
                                    if (name != event.ticketTypes.keys.last()) HorizontalDivider(color = Color.LightGray.copy(0.3f))
                                }
                            }
                        }

                        Spacer(Modifier.height(16.dp))
                        HorizontalDivider()
                        Spacer(Modifier.height(16.dp))

                        // --- 6. FEATURED PROFILES (Artists/Speakers) ---
                        if (event.featuredProfiles.isNotEmpty()) {
                            Text("Featured Guests", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Spacer(Modifier.height(8.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                // LƯU Ý: Cần đảm bảo Event Mapper đã map List<FeaturedProfileDto> đúng
                                val profiles = (event.featuredProfiles as? List<*>)?.filterIsInstance<FeaturedProfileDto>() ?: emptyList()

                                items(profiles) { profile ->
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(80.dp)) {
                                        AsyncImage(
                                            model = profile.imageUrl ?: R.drawable.default_pfp,
                                            contentDescription = null,
                                            modifier = Modifier.size(60.dp).clip(CircleShape),
                                            contentScale = ContentScale.Crop
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        Text(profile.name, fontSize = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text(profile.profileType ?: "", fontSize = 10.sp, color = Color.Gray)
                                    }
                                }
                            }
                            Spacer(Modifier.height(16.dp))
                            HorizontalDivider()
                            Spacer(Modifier.height(16.dp))
                        }

                        // --- 7. SYSTEM METADATA ---
                        Text("System Metadata", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.Gray)
                        Spacer(Modifier.height(8.dp))
                        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFECEFF1))) {
                            Column(Modifier.padding(12.dp)) {
                                MetadataRow("ID", event.id)
                                MetadataRow("Organizer ID", "Check Database") // Hoặc hiển thị nếu có
                                MetadataRow("Visibility", event.visibility)
                                MetadataRow("Is Outdoor", event.isOutdoor.toString())
                                MetadataRow("Require Age", "${event.requiredAge}+")
                                MetadataRow("Created At", formatFullDate(event.createdAt))
                                MetadataRow("Views", event.viewCount.toString())
                            }
                        }

                        Spacer(Modifier.height(40.dp))
                    }
                }
            } else {
                // Error state
                Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.ErrorOutline, null, tint = Color.Red, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(8.dp))
                    Text("Không thể tải thông tin sự kiện.", color = Color.Gray)
                }
            }
        }
    }
}

// --- HELPER COMPOSABLES ---

@Composable
fun DetailRow(icon: ImageVector, text: String) {
    Row(verticalAlignment = Alignment.Top, modifier = Modifier.padding(vertical = 4.dp)) {
        Icon(icon, null, tint = Color.Gray, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Text(text, fontSize = 15.sp, color = Color.Black)
    }
}

@Composable
fun DetailLinkRow(icon: ImageVector, url: String, label: String? = null) {
    val context = LocalContext.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .padding(vertical = 4.dp)
            .clickable {
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    context.startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(context, "Cannot open link", Toast.LENGTH_SHORT).show()
                }
            }
    ) {
        Icon(icon, null, tint = AppTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Text(
            text = label ?: url,
            fontSize = 15.sp,
            color = AppTheme.colorScheme.primary,
            textDecoration = TextDecoration.Underline,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
fun MetadataRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(label, fontSize = 12.sp, color = Color.Gray, modifier = Modifier.width(100.dp))
        SelectionContainer {
            Text(value, fontSize = 12.sp, fontWeight = FontWeight.Medium, fontStyle = FontStyle.Italic)
        }
    }
}

fun getStatusColor(status: String): Color {
    return when (status.lowercase()) {
        "active" -> Color(0xFF4CAF50)
        "pending" -> Color(0xFFFF9800)
        "rejected", "cancelled" -> Color(0xFFF44336)
        else -> Color.Gray
    }
}

fun formatFullDate(timestamp: Long): String {
    return try {
        if (timestamp == 0L) return "N/A"
        val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())
        sdf.format(Date(timestamp))
    } catch (e: Exception) { "?" }
}