package com.tdtuer.eventing.ui.screens.profile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels // Added for ViewModel
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
// R class import is still needed for resources used directly in UI if not from ViewModel
import com.tdtuer.eventing.ui.theme.EventingTheme
// ProfileData and ProfileInterest are now in MyProfileViewModel.kt

class MyProfile : ComponentActivity() {
    private val viewModel: MyProfileViewModel by viewModels() // Use ViewModel delegate

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                MyProfileScreen(viewModel = viewModel) // Pass ViewModel
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun MyProfileScreen(viewModel: MyProfileViewModel) { // Accept ViewModel
    val profileData by viewModel.profileData // Observe data from ViewModel

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profile") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackNavigationClick() }) { // Delegate to ViewModel
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White,
                    titleContentColor = Color.Black
                )
            )
        },
        containerColor = Color.White
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(24.dp))
            ProfileHeader(userAvatarRes = profileData.profilePictureRes, userName = profileData.userName)
            Spacer(modifier = Modifier.height(24.dp))
            StatsSection(following = profileData.followingCount, followers = profileData.followersCount)
            Spacer(modifier = Modifier.height(24.dp))
            OutlinedButton(
                onClick = { viewModel.onEditProfileClick() }, // Delegate to ViewModel
                modifier = Modifier.fillMaxWidth(0.6f)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Edit, contentDescription = "Edit Icon", tint = Color(0xFF5669FF))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Edit Profile", color = Color(0xFF5669FF))
                }
            }
            Spacer(modifier = Modifier.height(32.dp))
            AboutMeSection(aboutMeText = profileData.aboutMe)
            Spacer(modifier = Modifier.height(24.dp))
            InterestSection(
                interests = profileData.interests,
                onChangeInterestClick = { viewModel.onChangeInterestClick() } // Delegate
            )
        }
    }
}

@Composable
fun ProfileHeader(userAvatarRes: Int, userName: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Image(
            painter = painterResource(id = userAvatarRes), // From ViewModel
            contentDescription = "Profile Picture",
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = userName, // From ViewModel
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun StatsSection(following: Int, followers: Int) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = following.toString(), fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text(text = "Following", color = Color.Gray)
        }
        HorizontalDivider(
            modifier = Modifier
                .height(30.dp)
                .width(1.dp)
                .padding(horizontal = 24.dp),
            thickness = DividerDefaults.Thickness, color = DividerDefaults.color
        )
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = followers.toString(), fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text(text = "Followers", color = Color.Gray)
        }
    }
}

@Composable
fun AboutMeSection(aboutMeText: String) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.Start
    ) {
        Text(text = "About Me", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = aboutMeText, // From ViewModel
            color = Color.Gray,
            lineHeight = 22.sp
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun InterestSection(interests: List<ProfileInterest>, onChangeInterestClick: () -> Unit) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(text = "Interest", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            TextButton(onClick = onChangeInterestClick) { // Delegated
                Text(text = "CHANGE", color = Color(0xFF5669FF), textDecoration = TextDecoration.Underline)
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            interests.forEach { interest ->
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = interest.backgroundColor
                ) {
                    Text(
                        text = interest.name,
                        color = interest.color,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun MyProfileScreenPreview() {
    EventingTheme {
        // For preview, create a new instance of the ViewModel
        MyProfileScreen(viewModel = MyProfileViewModel())
    }
}
