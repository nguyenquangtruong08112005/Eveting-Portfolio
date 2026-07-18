package com.tdtuer.eventing_organizer.helpers

import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

/**
 * Maps technical API / network failures to short messages safe for UI.
 * Never surface raw HTTP codes, stacks, or errorBody dumps to users.
 */
object UserFacingErrors {

    private val CODE_IN_MESSAGE = Regex(
        """(?i)(with\s+)?code\s*[:\s]*\d{3}|HTTP\s*\d{3}|status\s*\d{3}|Server error:\s*\d+|failed with code:\s*\d+|Error:\s*\d+"""
    )

    fun fromHttp(code: Int, errorBody: String? = null, actionHint: String? = null): Exception {
        val fromBody = parseServerMessage(errorBody)
        val message = when {
            !fromBody.isNullOrBlank() && !looksTechnical(fromBody) -> fromBody
            else -> messageForHttpCode(code, actionHint)
        }
        return UserFacingException(message, code)
    }

    fun toUserMessage(throwable: Throwable?): String {
        if (throwable == null) return generic()
        if (throwable is UserFacingException) return throwable.message ?: generic()

        when (throwable) {
            is UnknownHostException -> return "No internet connection. Please check your network and try again."
            is SocketTimeoutException -> return "The request timed out. Please try again."
            is IOException -> return "Network error. Please try again."
        }

        val raw = throwable.message?.trim().orEmpty()
        if (raw.isBlank()) return generic()

        val codeMatch = Regex("""\b([45]\d{2})\b""").find(raw)
        if (codeMatch != null && looksTechnical(raw)) {
            val code = codeMatch.groupValues[1].toIntOrNull()
            if (code != null) return messageForHttpCode(code, null)
        }

        if (looksTechnical(raw)) return generic()
        return sanitize(raw)
    }

    fun failure(throwable: Throwable): Exception {
        if (throwable is UserFacingException) return throwable
        return UserFacingException(toUserMessage(throwable))
    }

    fun failure(message: String): Exception = UserFacingException(sanitize(message))

    private fun messageForHttpCode(code: Int, actionHint: String?): String {
        val base = when (code) {
            400 -> "Invalid request. Please check your input and try again."
            401 -> "Please sign in again to continue."
            403 -> "You do not have permission to do that."
            404 -> "We could not find what you were looking for."
            409 -> "This action conflicts with existing data (for example, email already in use)."
            422 -> "Some information is invalid. Please review and try again."
            429 -> "Too many requests. Please wait a moment and try again."
            in 500..599 -> "Something went wrong on our side. Please try again later."
            else -> generic()
        }
        return if (!actionHint.isNullOrBlank() && code !in 500..599) {
            if (looksTechnical(actionHint)) base else actionHint
        } else {
            base
        }
    }

    private fun parseServerMessage(errorBody: String?): String? {
        if (errorBody.isNullOrBlank()) return null
        val trimmed = errorBody.trim()
        if (trimmed.startsWith("{")) {
            extractJsonStringField(trimmed, "message")?.let { return it }
            val plainError = Regex(""""error"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"""")
                .find(trimmed)
                ?.groupValues
                ?.getOrNull(1)
                ?.replace("\\\"", "\"")
            if (!plainError.isNullOrBlank() && !plainError.startsWith("{")) {
                return plainError
            }
            return null
        }
        return if (trimmed.length <= 160 && !looksTechnical(trimmed)) trimmed else null
    }

    private fun extractJsonStringField(json: String, field: String): String? {
        val re = Regex(""""$field"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"""")
        val matches = re.findAll(json).map { it.groupValues[1].replace("\\\"", "\"") }.toList()
        return matches.lastOrNull { it.isNotBlank() }
    }

    private fun looksTechnical(text: String): Boolean {
        if (CODE_IN_MESSAGE.containsMatchIn(text)) return true
        if (text.contains("Exception", ignoreCase = true)) return true
        if (text.contains("errorBody", ignoreCase = true)) return true
        if (text.contains("at com.", ignoreCase = true)) return true
        if (text.startsWith("HTTP ", ignoreCase = true)) return true
        if (Regex("""Response\{""").containsMatchIn(text)) return true
        return false
    }

    private fun sanitize(text: String): String {
        val cleaned = text
            .replace(CODE_IN_MESSAGE, "")
            .replace(Regex("""\s{2,}"""), " ")
            .trim()
        return cleaned.ifBlank { generic() }
    }

    private fun generic(): String = "Something went wrong. Please try again."
}

class UserFacingException(
    message: String,
    val httpCode: Int? = null,
    cause: Throwable? = null
) : Exception(message, cause)

fun Throwable?.toUserMessage(): String = UserFacingErrors.toUserMessage(this)
