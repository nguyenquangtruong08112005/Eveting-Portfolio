package com.tdtuer.eventing.ui.screens.invite

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels // Added for ViewModel
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items // Keep this import
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
// R class import is still needed for resources used directly in UI if any, or can be removed if all come via ViewModel
import com.tdtuer.eventing.R 
import com.tdtuer.eventing.ui.theme.EventingTheme
// Friend data class is now in InviteFriendViewModel.kt

// --- Activity ---
class InviteFriendActivity : ComponentActivity() {
    private val viewModel: InviteFriendViewModel by viewModels() // Use ViewModel delegate

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                Box(modifier = Modifier.fillMaxSize().background(Color.Gray.copy(alpha = 0.5f))) {
                    InviteFriendScreen(viewModel = viewModel) // Pass ViewModel
                }
            }
        }
    }
}

// --- Composable cho toàn bộ màn hình Invite Friend (dưới dạng Bottom Sheet) ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InviteFriendScreen(viewModel: InviteFriendViewModel) { // Accept ViewModel
    val searchText = viewModel.searchText
    val filteredFriends by viewModel.filteredFriends // Observe from ViewModel

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            .background(Color.White)
            .padding(vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(
            modifier = Modifier
                .width(40.dp)
                .height(4.dp)
                .background(Color.LightGray, RoundedCornerShape(2.dp))
        )
        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = searchText,
            onValueChange = { viewModel.onSearchTextChange(it) }, // Delegate to ViewModel
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

        Box(modifier = Modifier.fillMaxWidth().weight(1f)) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp)
            ) {
                items(filteredFriends, key = { it.id }) { friend ->
                    FriendItemRow(friend = friend, onFriendSelected = { viewModel.onFriendSelected(it) }) // Delegate
                }
            }

            Button(
                onClick = { viewModel.onInviteClick() }, // Delegate to ViewModel
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
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
            .clickable { onFriendSelected(friend) }
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Image(
            painter = painterResource(id = friend.avatarRes), // avatarRes comes from Friend data class
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
        Box(modifier = Modifier.fillMaxSize().background(Color.Gray.copy(alpha = 0.5f)), contentAlignment = Alignment.BottomCenter) {
            // For preview, create a new instance of the ViewModel
            InviteFriendScreen(viewModel = InviteFriendViewModel())
        }
    }
}
