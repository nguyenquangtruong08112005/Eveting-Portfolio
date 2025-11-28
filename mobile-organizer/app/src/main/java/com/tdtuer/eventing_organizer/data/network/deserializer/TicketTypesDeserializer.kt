package com.tdtuer.eventing_organizer.data.network.deserializer

import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.tdtuer.eventing_organizer.data.network.model.TicketTypeDetailsDto
import java.lang.reflect.Type

/**
 * Deserializer thông minh để xử lý trường hợp ticketTypes bị trả về không đồng nhất.
 * - Hỗ trợ đọc Map (Object) { "VIP": {...} } -> Chuẩn mới.
 * - Hỗ trợ đọc List (Array) [ {...}, {...} ] -> Tự động convert sang Map để tránh crash.
 */
class TicketTypesDeserializer : JsonDeserializer<Map<String, TicketTypeDetailsDto>> {
    override fun deserialize(
        json: JsonElement,
        typeOfT: Type,
        context: JsonDeserializationContext
    ): Map<String, TicketTypeDetailsDto> {
        val result = mutableMapOf<String, TicketTypeDetailsDto>()

        try {
            if (json.isJsonObject) {
                // TRƯỜNG HỢP 1: Dữ liệu chuẩn là Map
                json.asJsonObject.entrySet().forEach { (key, element) ->
                    val ticket = context.deserialize<TicketTypeDetailsDto>(element, TicketTypeDetailsDto::class.java)
                    // Nếu key rỗng (hiếm), fallback lấy name từ ticket
                    val finalKey = key.ifBlank { ticket.name ?: "unknown_${System.currentTimeMillis()}" }
                    result[finalKey] = ticket
                }
            } else if (json.isJsonArray) {
                // TRƯỜNG HỢP 2: Dữ liệu bị lỗi thành List (Do code cũ update nhầm)
                json.asJsonArray.forEach { element ->
                    val ticket = context.deserialize<TicketTypeDetailsDto>(element, TicketTypeDetailsDto::class.java)
                    // Tự động tạo key từ tên vé
                    val key = ticket.name?.takeIf { it.isNotBlank() } ?: "ticket_${System.nanoTime()}"
                    result[key] = ticket
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            // Trả về map rỗng thay vì crash app nếu có lỗi parse sâu bên trong
        }

        return result
    }
}