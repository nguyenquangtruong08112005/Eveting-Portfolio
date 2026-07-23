import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.Density
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.toRect

/**
 * Một Shape tùy chỉnh cắt Card theo hình dạng vé.
 * @param cornerRadius Bán kính bo góc (ví dụ: 16.dp).
 * @param cutoutRadius Bán kính của vết lõm (ví dụ: 12.dp).
 * @param junctionY Vị trí Y (tính từ trên xuống) nơi vết lõm xuất hiện (ví dụ: 150.dp).
 */
class TicketShape(
    private val cornerRadius: Dp,
    private val cutoutRadius: Dp,
    private val junctionY: Dp
) : Shape {

    override fun createOutline(
        size: Size,
        layoutDirection: LayoutDirection,
        density: Density
    ): Outline {
        val path = drawTicketPath(size, density)
        return Outline.Generic(path)
    }

    private fun drawTicketPath(size: Size, density: Density): Path {
        with(density) {
            val cornerRadiusPx = cornerRadius.toPx()
            val cutoutRadiusPx = cutoutRadius.toPx()
            val junctionYPx = junctionY.toPx()

            // *** SỬA LỖI CRASH (GUARD CLAUSE) ***
            // Tính toán tổng không gian tối thiểu cần thiết cho các góc và vết lõm
            val minHeightForCorners = cornerRadiusPx * 2
            val minHeightForCutouts = cutoutRadiusPx * 2

            // Kiểm tra xem chiều cao của Card (size.height) có đủ lớn
            // để chứa cả góc bo và vết lõm hay không.
            // (12.dp + 16.dp) * 2
            val requiredHeight = (cutoutRadiusPx + cornerRadiusPx) * 2

            if (size.height < requiredHeight || size.width < (cutoutRadiusPx + cornerRadiusPx) * 2) {
                // Nếu chiều cao hoặc chiều rộng là 0 (hoặc quá nhỏ) trong frame đầu tiên,
                // hãy trả về một hình chữ nhật bo góc đơn giản để tránh crash.
                return Path().apply {
                    addRoundRect(RoundRect(size.toRect(), CornerRadius(cornerRadiusPx)))
                }
            }
            // *** KẾT THÚC SỬA LỖI ***


            // Bây giờ 'coerceIn' đã an toàn vì size.height đủ lớn
            val safeJunctionY = junctionYPx.coerceIn(
                cutoutRadiusPx + cornerRadiusPx,
                size.height - cutoutRadiusPx - cornerRadiusPx
            )

            return Path().apply {
                reset()

                // Top-left arc
                arcTo(
                    rect = Rect(0f, 0f, 2 * cornerRadiusPx, 2 * cornerRadiusPx),
                    startAngleDegrees = 180f,
                    sweepAngleDegrees = 90f,
                    forceMoveTo = false
                )
                lineTo(x = size.width - cornerRadiusPx, y = 0f)

                // Top-right arc
                arcTo(
                    rect = Rect(size.width - 2 * cornerRadiusPx, 0f, size.width, 2 * cornerRadiusPx),
                    startAngleDegrees = 270f,
                    sweepAngleDegrees = 90f,
                    forceMoveTo = false
                )

                // CẮT LÕM BÊN PHẢI
                lineTo(x = size.width, y = safeJunctionY - cutoutRadiusPx)
                arcTo(
                    rect = Rect(
                        left = size.width - cutoutRadiusPx,
                        top = safeJunctionY - cutoutRadiusPx,
                        right = size.width + cutoutRadiusPx,
                        bottom = safeJunctionY + cutoutRadiusPx
                    ),
                    startAngleDegrees = 270f,
                    sweepAngleDegrees = -180f,
                    forceMoveTo = false
                )

                lineTo(x = size.width, y = size.height - cornerRadiusPx)

                // Bottom-right arc
                arcTo(
                    rect = Rect(size.width - 2 * cornerRadiusPx, size.height - 2 * cornerRadiusPx, size.width, size.height),
                    startAngleDegrees = 0f,
                    sweepAngleDegrees = 90f,
                    forceMoveTo = false
                )

                lineTo(x = cornerRadiusPx, y = size.height)

                // Bottom-left arc
                arcTo(
                    rect = Rect(0f, size.height - 2 * cornerRadiusPx, 2 * cornerRadiusPx, size.height),
                    startAngleDegrees = 90f,
                    sweepAngleDegrees = 90f,
                    forceMoveTo = false
                )

                // CẮT LÕM BÊN TRÁI
                lineTo(x = 0f, y = safeJunctionY + cutoutRadiusPx)
                arcTo(
                    rect = Rect(
                        left = -cutoutRadiusPx,
                        top = safeJunctionY - cutoutRadiusPx,
                        right = cutoutRadiusPx,
                        bottom = safeJunctionY + cutoutRadiusPx
                    ),
                    startAngleDegrees = 90f,
                    sweepAngleDegrees = -180f,
                    forceMoveTo = false
                )

                lineTo(x = 0f, y = cornerRadiusPx)
                close()
            }
        }
    }
}