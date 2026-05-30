package com.tdtuer.eventing.domain.usecase.events

import android.net.Uri
import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Result
import javax.inject.Inject

class UploadEventMediaMultipartUseCase @Inject constructor(
    private val repository: EventRepository
) {
    suspend operator fun invoke(eventId: String, uri: Uri): Result<Unit> {
        return repository.uploadEventMediaMultipart(eventId, uri)
    }
}
