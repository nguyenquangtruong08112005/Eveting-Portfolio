package com.tdtuer.eventing.ui.screens.share

import android.content.Context
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.helpers.ShareUtils

// Cập nhật Data Model: Thêm packageName
data class ShareOption(
    val name: String,
    val iconRes: Int,
    val backgroundColor: Color,
    val packageName: String? = null, // Null nghĩa là hành động đặc biệt (Copy) hoặc System Share
    val isCopyAction: Boolean = false
)

class ShareViewModel : ViewModel() {

    // Dữ liệu mẫu đã map với Package Name thực tế
    val shareOptions: List<ShareOption> = listOf(
        ShareOption("Copy Link", R.drawable.copy_link, Color(0xFFF0F0F0), isCopyAction = true),
        ShareOption(
            "WhatsApp",
            R.drawable.whatsapp,
            Color(0xFFF0F0F0),
            packageName = "com.whatsapp"
        ),
        ShareOption(
            "Facebook",
            R.drawable.facebook,
            Color(0xFFF0F0F0),
            packageName = "com.facebook.katana"
        ),
        ShareOption(
            "Messenger",
            R.drawable.messenger,
            Color(0xFFF0F0F0),
            packageName = "com.facebook.orca"
        ),
        ShareOption(
            "X",
            R.drawable.twitter,
            Color(0xFFF0F0F0),
            packageName = "com.twitter.android"
        ), // Hoặc com.x.android
        ShareOption(
            "Instagram",
            R.drawable.instagram,
            Color(0xFFF0F0F0),
            packageName = "com.instagram.android"
        ),
        ShareOption(
            name = "Zalo",
            iconRes = R.drawable.icon_of_zalo, // Sửa lại thành icon Zalo thực tế
            backgroundColor = Color(0xFFF0F0F0), // Màu xanh Zalo Brand Color
            packageName = "com.zing.zalo" // Package Name cho Zalo
        ),
        ShareOption(
            "Message",
            R.drawable.chatting,
            Color(0xFFF0F0F0),
            packageName = "com.google.android.apps.messaging"
        ) // SMS mặc định
    )

    // Cần nhận thêm Context và Event để thực hiện chia sẻ
    fun onShareOptionClicked(context: Context, option: ShareOption, event: Event) {
        if (option.isCopyAction) {
            ShareUtils.copyToClipboard(context, event)
        } else {
            // Chia sẻ tới package cụ thể hoặc fallback
            ShareUtils.shareToPackage(context, event, option.packageName)
        }
    }
}