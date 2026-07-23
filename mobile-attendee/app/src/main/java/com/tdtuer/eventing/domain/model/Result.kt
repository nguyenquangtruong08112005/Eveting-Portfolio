package com.tdtuer.eventing.domain.model

sealed class Result<out T> {
    data class Success<out T>(val data: T) : Result<T>()
    data class Failure(val exception: Exception) : Result<Nothing>()
    object Loading : Result<Nothing>()

    companion object {}

    // Các hàm helper để sử dụng cho an toàn
    val isSuccess: Boolean
        get() = this is Success

    fun getOrNull(): T? =
        if (this is Success) this.data else null

    fun exceptionOrNull(): Exception? =
        if (this is Failure) this.exception else null
}

// Hàm helper bên ngoài (để dùng trong Repository)
inline fun <T> Result.Companion.success(data: T): Result<T> = Result.Success(data)
inline fun Result.Companion.failure(exception: Exception): Result.Failure = Result.Failure(exception)