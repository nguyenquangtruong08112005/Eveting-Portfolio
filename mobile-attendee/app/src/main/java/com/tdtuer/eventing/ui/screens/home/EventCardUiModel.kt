package com.tdtuer.eventing.ui.screens.home

data class EventCardUiModel(
    val id: String,
    val name: String,
    val imageUrl: String,
    val videoUrl: String? = null, // Thêm trường này (Nullable vì không phải event nào cũng có video)
    val displayDate: String,
    val displayMonth: String,
    val displayPrice: String,
    val displayLocation: String,
    val isFavorite: Boolean
)