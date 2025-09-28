package com.tdtuer.eventing.ui.screens.share

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels // Added for ViewModel
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable // Added for ShareOptionItem
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items // Keep this import
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
// import androidx.compose.runtime.remember // No longer needed for shareOptions list here
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
// R class import is still needed for resources used directly in UI if any
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.theme.EventingTheme
// ShareOption data class is now in ShareViewModel.kt

// --- Activity (để preview) ---
class ShareActivity : ComponentActivity() {
    private val viewModel: ShareViewModel by viewModels() // Use ViewModel delegate

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                // Giả lập nền mờ để hiển thị Bottom Sheet
                Box(modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.6f)),
                    contentAlignment = Alignment.BottomCenter
                ) {
                    // Pass ViewModel and onCancel from ViewModel
                    ShareBottomSheetContent(
                        viewModel = viewModel,
                        onCancel = { viewModel.onCancelClicked() } // Delegate to ViewModel
                    )
                }
            }
        }
    }
}


// --- Composable chứa nội dung của Bottom Sheet ---
@Composable
fun ShareBottomSheetContent(viewModel: ShareViewModel, onCancel: () -> Unit) { // Accept ViewModel
    val shareOptions = viewModel.shareOptions // Observe from ViewModel

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            .background(Color.White)
            .padding(vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Thanh kéo (Handle bar)
        Spacer(
            modifier = Modifier
                .width(40.dp)
                .height(4.dp)
                .background(Color.LightGray, RoundedCornerShape(2.dp))
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Tiêu đề
        Text(
            text = "Share with friends",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Lưới các icon chia sẻ
        LazyVerticalGrid(
            columns = GridCells.Fixed(4),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(shareOptions) { option ->
                ShareOptionItem(
                    option = option,
                    onClick = { viewModel.onShareOptionClicked(option) } // Delegate to ViewModel
                )
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        // Nút Cancel
        Button(
            onClick = onCancel, // Use the passed onCancel lambda (which delegates to ViewModel)
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFFF0F0F0),
                contentColor = Color.Black
            ),
            contentPadding = PaddingValues(vertical = 14.dp)
        ) {
            Text("CANCEL", fontWeight = FontWeight.SemiBold)
        }
    }
}

// --- Composable cho một item trong lưới (icon + tên) ---
@Composable
fun ShareOptionItem(option: ShareOption, onClick: () -> Unit) { // Accept onClick lambda
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.clickable(onClick = onClick) // Make the whole item clickable
    ) {
        // Icon tròn
        Box(
            modifier = Modifier
                .size(60.dp)
                .clip(CircleShape)
                .background(option.backgroundColor),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(id = option.iconRes), // From ShareOption data
                contentDescription = option.name,
                modifier = Modifier.size(32.dp)
            )
        }
        // Tên tùy chọn
        Text(text = option.name, fontSize = 12.sp, color = Color.Gray)
    }
}


// --- Preview ---
@Preview(showBackground = true)
@Composable
fun ShareBottomSheetContentPreview() {
    EventingTheme {
        // Giả lập nền mờ để hiển thị Bottom Sheet
        Box(modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.6f)),
            contentAlignment = Alignment.BottomCenter
        ) {
            // For preview, create a new instance of the ViewModel
            ShareBottomSheetContent(
                viewModel = ShareViewModel(),
                onCancel = {}
            )
        }
    }
}
