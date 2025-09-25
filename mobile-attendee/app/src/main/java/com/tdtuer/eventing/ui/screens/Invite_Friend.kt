package com.tdtuer.eventing.ui.screens

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Text
import com.tdtuer.eventing.R // Quan trọng: Thay bằng R của project bạn
import com.tdtuer.eventing.ui.screens.ui.theme.EventingTheme


// --- Data Model cho bạn bè ---
data class Friend(
    val id: Int,
    val name: String,
    val followers: String,
    val avatarRes: Int,
    var isSelected: Boolean = false // Để quản lý trạng thái chọn
)

// --- Activity ---
class InviteFriendActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                // Background overlay để mô phỏng trạng thái Bottom Sheet mở
                Box(modifier = Modifier.fillMaxSize().background(Color.Gray.copy(alpha = 0.5f))) {
                    InviteFriendScreen()
                }
            }
        }
    }
}

// --- Composable cho toàn bộ màn hình Invite Friend (dưới dạng Bottom Sheet) ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InviteFriendScreen() {
    val friends = remember {
        mutableStateListOf(
            Friend(1, "Alex Lee", "2k Followers", R.drawable.default_pfp),
            Friend(2, "Micheal Ulasi", "56 Followers", R.drawable.default_pfp),
            Friend(3, "Cristofer", "300 Followers", R.drawable.default_pfp),
            Friend(4, "David Silbia", "5k Followers", R.drawable.default_pfp),
            Friend(5, "Ashfak Sayem", "402 Followers", R.drawable.default_pfp),
            Friend(6, "Rocks Velkeinjen", "893 Followers", R.drawable.default_pfp),
            Friend(7, "Roman Kutepov", "225 Followers", R.drawable.default_pfp),
            Friend(8, "Cristofer Nolan", "322 Followers", R.drawable.default_pfp),
            Friend(9, "John Wick", "1.2k Followers", R.drawable.default_pfp),
            Friend(10, "Zenifero Bolex", "2k Followers", R.drawable.default_pfp),
            Friend(11, "Lena Bell", "150 Followers", R.drawable.default_pfp), // Placeholder
            Friend(12, "Mark Zukerberg", "10M Followers", R.drawable.default_pfp), // Placeholder
        )
    }
    var searchText by remember { mutableStateOf("") }

    // Lọc danh sách bạn bè dựa trên từ khóa tìm kiếm
    val filteredFriends = remember(searchText, friends) {
        if (searchText.isBlank()) {
            friends
        } else {
            friends.filter {
                it.name.contains(searchText, ignoreCase = true)
            }
        }
    }

    // ModalBottomSheetState sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false);
    // Nếu bạn muốn hiển thị dưới dạng Bottom Sheet thực sự, hãy sử dụng ModalBottomSheetLayout hoặc ModalNavigationDrawer (Material3)
    // Hiện tại chỉ giả lập giao diện của Bottom Sheet
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            .background(Color.White)
            .padding(vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Handle bar
        Spacer(
            modifier = Modifier
                .width(40.dp)
                .height(4.dp)
                .background(Color.LightGray, RoundedCornerShape(2.dp))
        )

        Spacer(modifier = Modifier.height(16.dp))

//        Text(
//            text = "Invite Friend",
//            fontSize = 20.sp,
//            fontWeight = FontWeight.Bold,
//            modifier = Modifier
//                .fillMaxWidth()
//                .padding(horizontal = 24.dp),
//            textAlign = Alignment.Start
//        )

        Spacer(modifier = Modifier.height(16.dp))

        // Search Bar
        OutlinedTextField(
            value = searchText,
            onValueChange = { searchText = it },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            placeholder = { Text("Search") },
            leadingIcon = {
                Icon(Icons.Default.Search, contentDescription = "Search Icon")
            },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = Color(0xFFF7F7F7),
                unfocusedContainerColor = Color(0xFFF7F7F7),
                disabledContainerColor = Color(0xFFF7F7F7),
                focusedBorderColor = Color.Transparent,
                unfocusedBorderColor = Color.Transparent,
            ),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Danh sách bạn bè
        Box(modifier = Modifier.fillMaxWidth().weight(1f)) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp)
            ) {
                items(filteredFriends, key = { it.id }) { friend ->
                    FriendItemRow(friend = friend) { selectedFriend ->
                        val index = friends.indexOfFirst { it.id == selectedFriend.id }
                        if (index != -1) {
                            friends[index] = selectedFriend.copy(isSelected = !selectedFriend.isSelected)
                        }
                    }
                }
            }

            // Nút INVITE cố định ở dưới cùng
            Button(
                onClick = { /* Handle invite */ },
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter) // Gắn vào phía dưới cùng của Box
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF5669FF)),
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(vertical = 12.dp)
            ) {
                Text("INVITE", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.width(8.dp))
                Icon(Icons.Default.ArrowForward, contentDescription = "Invite Arrow", tint = Color.White)
            }
        }
    }
}

// --- Composable cho một hàng bạn bè trong danh sách ---
@Composable
fun FriendItemRow(friend: Friend, onFriendSelected: (Friend) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onFriendSelected(friend) } // Click vào hàng để chọn
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Image(
            painter = painterResource(id = friend.avatarRes),
            contentDescription = "${friend.name} avatar",
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = friend.name,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
            Text(
                text = friend.followers,
                fontSize = 12.sp,
                color = Color.Gray
            )
        }

        // Checkbox
        Checkbox(
            checked = friend.isSelected,
            onCheckedChange = { onFriendSelected(friend) },
            colors = CheckboxDefaults.colors(
                checkedColor = Color(0xFF5669FF),
                uncheckedColor = Color.LightGray
            )
        )
    }
}


// --- Preview ---
@Preview(showBackground = true, showSystemUi = true)
@Composable
fun InviteFriendScreenPreview() {
    EventingTheme {
        // Đặt trong Box với màu nền xám để mô phỏng bottom sheet
        Box(modifier = Modifier.fillMaxSize().background(Color.Gray.copy(alpha = 0.5f)), contentAlignment = Alignment.BottomCenter) {
            InviteFriendScreen()
        }
    }
}