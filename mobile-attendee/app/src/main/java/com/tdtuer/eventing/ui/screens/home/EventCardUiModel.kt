package com.tdtuer.eventing.ui.screens.home

// (Bạn có thể thêm các import cho Category, v.v. vào file này)

// Model này chỉ chứa các String ĐÃ ĐƯỢC ĐỊNH DẠNG
// mà EventCard cần để hiển thị.
data class EventCardUiModel(
    val id: String,
    val name: String,
    val imageUrl: String,
    val displayDate: String,     // Ví dụ: "14"
    val displayMonth: String,    // Ví dụ: "DEC"
    val displayPrice: String,    // Ví dụ: "Starts at 150,000đ"
    val displayLocation: String, // Ví dụ: "New York, USA"
    val isFavorite: Boolean
)