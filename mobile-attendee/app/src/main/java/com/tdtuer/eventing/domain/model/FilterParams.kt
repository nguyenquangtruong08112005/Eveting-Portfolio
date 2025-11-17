// eventing.zip/domain/model/FilterParams.kt (TẠO FILE MỚI)
package com.tdtuer.eventing.domain.model

data class FilterParams(
    val query: String? = null,
    val categories: Set<String> = emptySet(),
    val datePreset: String? = null,
    val customDateRange: Pair<Long, Long>? = null,
    val location: String? = null,
    val priceRange: Pair<Double, Double>? = null,
    // artistName đã bị loại bỏ, vì nó sẽ được gộp vào 'query'
    val page: Int = 1,
    val limit: Int = 20
)