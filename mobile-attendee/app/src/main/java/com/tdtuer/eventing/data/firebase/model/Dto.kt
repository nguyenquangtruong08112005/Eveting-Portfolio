package com.tdtuer.eventing.data.firebase.model

// Mô hình dữ liệu sự kiện (Event) trong Firestore
// Trùng với cấu trúc dữ liệu trong Firestore
// Sử dụng khi lấy dữ liệu từ Firestore về
// Hoặc khi thêm dữ liệu vào Firestore
// Các trường phải trùng với tên trường trong Firestore
// Nếu không trùng sẽ bị lỗi khi parse dữ liệu
// Giá trị mặc định để tránh lỗi khi trường nào đó không có dữ liệu

data class Dto (
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val date: String = "",
    val time: String = "",
    val location: String = "",
    val imageUrl: String = ""
)