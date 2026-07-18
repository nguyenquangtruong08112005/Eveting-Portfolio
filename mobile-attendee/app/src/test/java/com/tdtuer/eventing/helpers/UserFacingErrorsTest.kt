package com.tdtuer.eventing.helpers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

/**
 * Unit tests for the shipped [UserFacingErrors] mapper.
 * Ensures raw HTTP codes / technical dumps never become the primary user string.
 */
class UserFacingErrorsTest {

    @Test
    fun fromHttp_401_isFriendlyAndHasNoCode() {
        val ex = UserFacingErrors.fromHttp(401, null) as UserFacingException
        assertFalse(ex.message!!.contains("401"))
        assertTrue(ex.message!!.contains("sign in", ignoreCase = true))
    }

    @Test
    fun fromHttp_500_isGenericServer() {
        val ex = UserFacingErrors.fromHttp(500, null)
        assertFalse(ex.message!!.contains("500"))
        assertTrue(ex.message!!.contains("try again", ignoreCase = true))
    }

    @Test
    fun fromHttp_prefersJsonErrorMessage() {
        val body = """{"error":{"message":"Email already registered","status":409,"code":"CONFLICT"}}"""
        val ex = UserFacingErrors.fromHttp(409, body)
        assertEquals("Email already registered", ex.message)
    }

    @Test
    fun toUserMessage_mapsLegacyCodeString() {
        val raw = Exception("Backend login failed with code: 401")
        val msg = UserFacingErrors.toUserMessage(raw)
        assertFalse(msg.contains("401"))
        assertFalse(msg.contains("code:", ignoreCase = true))
    }

    @Test
    fun toUserMessage_networkTypes() {
        assertTrue(
            UserFacingErrors.toUserMessage(UnknownHostException("host"))
                .contains("internet", ignoreCase = true)
        )
        assertTrue(
            UserFacingErrors.toUserMessage(SocketTimeoutException("timeout"))
                .contains("timed out", ignoreCase = true)
        )
        assertTrue(
            UserFacingErrors.toUserMessage(IOException("broken"))
                .contains("Network", ignoreCase = true)
        )
    }

    @Test
    fun toUserMessage_passesThroughUserFacingException() {
        val ufe = UserFacingException("Custom friendly")
        assertEquals("Custom friendly", UserFacingErrors.toUserMessage(ufe))
    }

    @Test
    fun extension_toUserMessage_works() {
        val t: Throwable = Exception("Server error: 503")
        assertFalse(t.toUserMessage().contains("503"))
    }
}
