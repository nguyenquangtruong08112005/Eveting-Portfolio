package com.tdtuer.eventing.domain.usecase.user

import android.net.Uri
import com.tdtuer.eventing.data.repository.UserRepository
import com.tdtuer.eventing.domain.model.Result
import javax.inject.Inject

class UploadImageUseCase @Inject constructor(
    private val repository: UserRepository
) {
    /**
     * Upload ảnh lên đường dẫn chỉ định.
     * @param path: Đường dẫn đầy đủ trên backend storage (ví dụ: "events/123/uploads/user_456/image.jpg")
     */
    suspend operator fun invoke(uri: Uri, path: String): Result<String> {
        return repository.uploadImage(uri, path)
    }
}