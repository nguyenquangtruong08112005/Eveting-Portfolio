package com.tdtuer.eventing_organizer.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.tdtuer.eventing_organizer.R

// 1. Định nghĩa FontFamily (giữ nguyên)
val Poppins = FontFamily(
    Font(R.font.poppins_regular, FontWeight.Normal),
    Font(R.font.poppins_medium, FontWeight.Medium),
    Font(R.font.poppins_semibold, FontWeight.SemiBold),
    Font(R.font.poppins_bold, FontWeight.Bold)
)

// 2. Định nghĩa TẤT CẢ các TextStyle tùy chỉnh từ thiết kế của bạn
// Điều này giúp code sạch sẽ và dễ quản lý
val heading01 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 32.sp,
    lineHeight = 40.sp,
    letterSpacing = 0.sp
)

val heading02 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 28.sp,
    lineHeight = 36.sp,
    letterSpacing = 0.sp
)

val heading03 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 24.sp,
    lineHeight = 32.sp,
    letterSpacing = 0.sp
)

val heading04 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 20.sp,
    lineHeight = 28.sp,
    letterSpacing = 0.sp
)

val heading05 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 18.sp,
    lineHeight = 24.sp,
    letterSpacing = 0.sp
)

val heading06 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 16.sp,
    lineHeight = 24.sp,
    letterSpacing = 0.sp
)

// --- Body Styles ---
val body01 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.Normal,
    fontSize = 16.sp,
    lineHeight = 24.sp,
    letterSpacing = 0.sp
)

val body02 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.Normal,
    fontSize = 14.sp,
    lineHeight = 20.sp,
    letterSpacing = 0.sp
)

val body03 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.Normal,
    fontSize = 12.sp,
    lineHeight = 16.sp,
    letterSpacing = 0.sp
)

val body04 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.Medium,
    fontSize = 16.sp,
    lineHeight = 24.sp,
    letterSpacing = 0.sp
)

val body05 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.Medium,
    fontSize = 14.sp,
    lineHeight = 20.sp,
    letterSpacing = 0.sp
)

val body06 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.Medium,
    fontSize = 12.sp,
    lineHeight = 16.sp,
    letterSpacing = 0.sp
)

val body07 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 14.sp,
    lineHeight = 20.sp,
    letterSpacing = 0.sp
)

val body08 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 12.sp,
    lineHeight = 16.sp,
    letterSpacing = 0.sp
)


// --- Button Styles ---
val button01 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 16.sp,
    lineHeight = 16.sp, // Theo design là Auto, thường là bằng hoặc lớn hơn fontSize một chút
    letterSpacing = 0.sp
)

val button02 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 14.sp,
    lineHeight = 16.sp,
    letterSpacing = 0.sp
)

val button03 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 12.sp,
    lineHeight = 16.sp, // Theo design là Auto
    letterSpacing = 0.sp
)

val button04 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 10.sp,
    lineHeight = 16.sp, // Theo design là Auto
    letterSpacing = 0.sp
)


// --- Caption Styles ---
val caption01 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.Normal,
    fontSize = 16.sp,
    lineHeight = 24.sp,
    letterSpacing = 0.sp
)

val caption02 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.Normal,
    fontSize = 14.sp,
    lineHeight = 20.sp,
    letterSpacing = 0.sp
)

val caption03 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.Normal,
    fontSize = 12.sp,
    lineHeight = 16.sp,
    letterSpacing = 0.sp
)

val caption04 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.Medium,
    fontSize = 12.sp,
    lineHeight = 16.sp,
    letterSpacing = 0.sp
)

val caption05 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 16.sp,
    lineHeight = 24.sp,
    letterSpacing = 0.sp
)

val caption06 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 14.sp,
    lineHeight = 20.sp,
    letterSpacing = 0.sp
)

val caption07 = TextStyle(
    fontFamily = Poppins,
    fontWeight = FontWeight.SemiBold,
    fontSize = 12.sp,
    lineHeight = 16.sp,
    letterSpacing = 0.sp
)


// 3. Khởi tạo đối tượng Typography và ánh xạ các style chính
val AppTypography = Typography(
    // Ánh xạ Heading 01-03 vào headline
    headlineLarge = heading01,
    headlineMedium = heading02,
    headlineSmall = heading03,

    // Ánh xạ Heading 04-06 vào title
    titleLarge = heading04,
    titleMedium = heading05,
    titleSmall = heading06,

    // Ánh xạ Body 01-03 vào body
    bodyLarge = body01,
    bodyMedium = body02,
    bodySmall = body03,

    // Ánh xạ Button 01-03 vào label (dùng cho button)
    labelLarge = button01,
    labelMedium = button02,
    labelSmall = button03,

    /*
     Các style display không có trong thiết kế của bạn.
     Bạn có thể giữ chúng từ mặc định hoặc định nghĩa riêng nếu cần.
     Ở đây tôi sẽ comment chúng đi.
    displayLarge = TextStyle(...),
    displayMedium = TextStyle(...),
    displaySmall = TextStyle(...),
    */
)

// 4. Định nghĩa các thuộc tính mở rộng cho các style còn lại
// Sử dụng `val` với `get()` để chúng trở thành thuộc tính của Typography

val Typography.body04: TextStyle
    get() = com.tdtuer.eventing_organizer.ui.theme.body04

val Typography.body05: TextStyle
    get() = com.tdtuer.eventing_organizer.ui.theme.body05

val Typography.body06: TextStyle
    get() = com.tdtuer.eventing_organizer.ui.theme.body06

val Typography.body07: TextStyle
    get() = com.tdtuer.eventing_organizer.ui.theme.body07

val Typography.body08: TextStyle
    get() = com.tdtuer.eventing_organizer.ui.theme.body08

val Typography.button04: TextStyle
    get() = com.tdtuer.eventing_organizer.ui.theme.button04

val Typography.caption01: TextStyle
    get() = com.tdtuer.eventing_organizer.ui.theme.caption01

val Typography.caption02: TextStyle
    get() = com.tdtuer.eventing_organizer.ui.theme.caption02

val Typography.caption03: TextStyle
    get() = com.tdtuer.eventing_organizer.ui.theme.caption03

val Typography.caption04: TextStyle
    get() = com.tdtuer.eventing_organizer.ui.theme.caption04

val Typography.caption05: TextStyle
    get() = com.tdtuer.eventing_organizer.ui.theme.caption05

val Typography.caption06: TextStyle
    get() = com.tdtuer.eventing_organizer.ui.theme.caption06

val Typography.caption07: TextStyle
    get() = com.tdtuer.eventing_organizer.ui.theme.caption07