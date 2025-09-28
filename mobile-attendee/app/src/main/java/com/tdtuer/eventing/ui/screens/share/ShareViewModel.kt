package com.tdtuer.eventing.ui.screens.share

import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R // Assuming R class is available

// --- Data Model cho một tùy chọn chia sẻ ---
data class ShareOption(
    val name: String,
    val iconRes: Int,
    val backgroundColor: Color // Background for the icon circle
)

class ShareViewModel : ViewModel() {

    // Dữ liệu mẫu cho các tùy chọn chia sẻ
    val shareOptions: List<ShareOption> = listOf(
        ShareOption("Copy Link", R.drawable.default_pfp, Color(0xFFF0F0F0)), // Replace R.drawable.default_pfp with actual icons
        ShareOption("WhatsApp", R.drawable.default_pfp, Color(0xFF25D366)),
        ShareOption("Facebook", R.drawable.default_pfp, Color(0xFF1877F2)),
        ShareOption("Messenger", R.drawable.default_pfp, Color(0xFF00B2FF)),
        ShareOption("Twitter", R.drawable.default_pfp, Color(0xFF1DA1F2)),
        ShareOption("Instagram", R.drawable.default_pfp, Color(0xFFE4405F)),
        ShareOption("Skype", R.drawable.default_pfp, Color(0xFF00AFF0)),
        ShareOption("Message", R.drawable.default_pfp, Color(0xFF4CAF50))
    )

    fun onShareOptionClicked(option: ShareOption) {
        // TODO: Implement logic for when a share option is clicked.
        // This might involve preparing data for a share intent or other actions.
        println("Share option clicked: ${option.name}")
        // For example, you might want to call a callback function passed to the ViewModel
        // or use a SharedFlow to notify the UI/Activity to perform the actual sharing.
    }

    // The onCancel action is typically handled by the composable that shows the BottomSheet,
    // but the ViewModel could be notified if needed for any cleanup or state change.
    fun onCancelClicked() {
        println("Cancel clicked in ShareBottomSheet")
        // Potentially notify the hosting Activity/Fragment if the ViewModel needs to react.
    }
}
