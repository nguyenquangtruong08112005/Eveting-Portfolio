package com.tdtuer.eventing_organizer.ui.components

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog

/**
 * Một Modal (hộp thoại) chung có thể tái sử dụng.
 * @param onDismissRequest Được gọi khi người dùng muốn đóng hộp thoại (nhấn ra ngoài hoặc nút back).
 * @param content Nội dung Composable bạn muốn hiển thị bên trong hộp thoại.
 */
@Composable
fun AppModal(
    onDismissRequest: () -> Unit,
    content: @Composable () -> Unit // Đây chính là "khe cắm" (slot)
) {
    Dialog(onDismissRequest = onDismissRequest) {
        Card(
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            // Nội dung bạn truyền vào sẽ được đặt ở đây
            content()
        }
    }
}