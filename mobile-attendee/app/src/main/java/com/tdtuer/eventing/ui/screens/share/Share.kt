package com.tdtuer.eventing.ui.screens.share

import android.graphics.drawable.Drawable
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext // Import này quan trọng
import com.tdtuer.eventing.domain.model.Event
import androidx.compose.foundation.layout.* // Giữ các import cũ
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.remember
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import com.tdtuer.eventing.ui.theme.EventingTheme
import com.google.accompanist.drawablepainter.rememberDrawablePainter // <-- CẦN IMPORT NÀY
import com.tdtuer.eventing.helpers.ShareUtils
import com.tdtuer.eventing.helpers.ShareUtils.getAppIconDrawable

@Composable
fun ShareBottomSheetContent(
    viewModel: ShareViewModel, event: Event, // <--- THÊM THAM SỐ NÀY
    onCancel: () -> Unit
) {
    val shareOptions = viewModel.shareOptions
    val context = LocalContext.current // <--- Lấy Context tại đây

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding() // Quan trọng để không bị che bởi navigation bar
            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            .background(Color.White)
            .padding(vertical = 16.dp), horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Share with friends",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
        )

        Spacer(modifier = Modifier.height(24.dp))

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
                    option = option, onClick = {
                        // Gọi ViewModel với context và event
                        viewModel.onShareOptionClicked(context, option, event)
                        onCancel() // Đóng sheet sau khi chọn
                    })
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = onCancel,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFFF0F0F0), contentColor = Color.Black
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
                modifier = Modifier.size(36.dp)
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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.6f)),
            contentAlignment = Alignment.BottomCenter
        ) {
            // For preview, create a new instance of the ViewModel
            ShareBottomSheetContent(
                viewModel = ShareViewModel(), onCancel = {}, event = Event()
            )
        }
    }
}
