package com.tdtuer.eventing.helpers

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.widget.Toast
import com.tdtuer.eventing.domain.model.Event

object ShareUtils {

    // 1. Giả lập tạo Deep Link (Trong thực tế bạn cần cấu hình AndroidManifest hoặc dùng App Links/Branch.io)
    private const val EVENT_HOST = "eventing.tdtuer.com"

    fun generateEventLink(eventId: String): String {
        return "https://$EVENT_HOST/events/$eventId"
    }

    fun createShareContent(event: Event): String {
        val link = generateEventLink(event.id)
        val date = "${formatTimestampToDay(event.date)} ${formatTimestampToMonth(event.date)}"
        return """
            Check out this amazing event: ${event.name}
            📅 Date: $date
            📍 Location: ${event.location}
            
            Get your tickets here: $link
        """.trimIndent()
    }

    // 3. Hàm gọi Intent chung (System Share Sheet)
    fun shareEventCheck(context: Context, event: Event) {
        val content = createShareContent(event)
        val sendIntent: Intent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, content)
            type = "text/plain"
        }
        val shareIntent = Intent.createChooser(sendIntent, "Share event via")
        context.startActivity(shareIntent)
    }

    // 4. Hàm chia sẻ tới package cụ thể (Facebook, WhatsApp, v.v.)
    fun shareToPackage(context: Context, event: Event, packageName: String?) {
        val content = createShareContent(event)

        if (packageName == null) {
            // Nếu không có package cụ thể (ví dụ nút "More"), gọi system sheet
            shareEventCheck(context, event)
            return
        }

        val intent = Intent(Intent.ACTION_SEND).apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, content)
            type = "text/plain"
            setPackage(packageName)
        }

        try {
            context.startActivity(intent)
        } catch (e: Exception) {
            // Nếu user chưa cài app đó, fallback về system share hoặc thông báo
            Toast.makeText(context, "App not installed, opening system share...", Toast.LENGTH_SHORT).show()
            shareEventCheck(context, event)
        }
    }

    // 5. Hàm Copy Link
    fun copyToClipboard(context: Context, event: Event) {
        val link = generateEventLink(event.id)
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Event Link", link)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(context, "Link copied to clipboard!", Toast.LENGTH_SHORT).show()
    }

    /**
     * Tải Drawable icon của ứng dụng dựa trên package name.
     */
    fun getAppIconDrawable(context: Context, packageName: String?): Drawable? {
        if (packageName == null) return null

        return try {
            val packageManager = context.packageManager
            packageManager.getApplicationIcon(packageName)
        } catch (e: PackageManager.NameNotFoundException) {
            null // Trả về null nếu ứng dụng không được cài đặt
        } catch (e: Exception) {
            null
        }
    }
}