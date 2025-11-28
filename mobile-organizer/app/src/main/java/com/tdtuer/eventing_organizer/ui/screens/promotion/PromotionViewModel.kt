package com.tdtuer.eventing_organizer.ui.screens.promotion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.data.network.model.CreatePromotionRequest
import com.tdtuer.eventing_organizer.data.network.model.UpdatePromotionRequest
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Promotion
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.usecase.authentication.SignOutUseCase // <-- Import mới
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PromotionUiState(
    val isLoading: Boolean = false,
    val promotions: List<Promotion> = emptyList(),
    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class PromotionViewModel @Inject constructor(
    private val repository: EventRepository,
    private val signOutUseCase: SignOutUseCase // <-- Inject SignOutUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(PromotionUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadPromotions()
    }

    fun loadPromotions() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            repository.getPromotions().collectLatest { result ->
                when (result) {
                    is Result.Success -> _uiState.update { it.copy(isLoading = false, promotions = result.data) }
                    is Result.Failure -> _uiState.update { it.copy(isLoading = false, error = result.exception.message) }
                    else -> {}
                }
            }
        }
    }

    fun createPromotion(
        code: String,
        discountValue: Double,
        discountType: String,
        validFrom: Long,
        validUntil: Long,
        limit: Int,
        minQty: Int,
        desc: String,
        isPublic: Boolean
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val request = CreatePromotionRequest(
                code = code,
                discountValue = discountValue,
                discountType = discountType,
                description = desc,
                usageLimit = limit,
                validFrom = validFrom,
                validUntil = validUntil,
                minTicketQuantity = minQty,
                isPublic = isPublic
            )
            val result = repository.createPromotion(request)
            handleResult(result, "Tạo mã giảm giá thành công!")
        }
    }

    fun deletePromotion(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val result = repository.deletePromotion(id)
            handleResult(result, "Đã xóa mã giảm giá.")
        }
    }

    fun extendPromotion(id: String, newEndDate: Long) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val result = repository.updatePromotion(id, UpdatePromotionRequest(validUntil = newEndDate))
            handleResult(result, "Đã cập nhật ngày hết hạn.")
        }
    }

    // --- HÀM MỚI: Đăng xuất ---
    fun onSignOut(onSuccess: () -> Unit) {
        viewModelScope.launch {
            signOutUseCase()
            onSuccess()
        }
    }

    private fun handleResult(result: Result<Unit>, successMsg: String) {
        if (result is Result.Success) {
            _uiState.update { it.copy(isLoading = false, successMessage = successMsg) }
            loadPromotions() // Reload list
        } else {
            val err = (result as Result.Failure).exception.message
            _uiState.update { it.copy(isLoading = false, error = err) }
        }
    }

    fun clearMessages() {
        _uiState.update { it.copy(error = null, successMessage = null) }
    }
}