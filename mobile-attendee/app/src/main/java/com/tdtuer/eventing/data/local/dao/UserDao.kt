package com.tdtuer.eventing.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.tdtuer.eventing.data.local.entity.UserEntity

@Dao
interface UserDao {
    // Lấy profile (thường chỉ có 1 row cho user đang đăng nhập)
    @Query("SELECT * FROM user_profile LIMIT 1")
    suspend fun getUserProfile(): UserEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: UserEntity)

    @Query("DELETE FROM user_profile")
    suspend fun clearUser()

    // Cập nhật nhanh 1 trường nào đó (ví dụ khi follow)
    @Query("UPDATE user_profile SET followingCount = :count WHERE id = :id")
    suspend fun updateFollowingCount(id: String, count: Int)
}