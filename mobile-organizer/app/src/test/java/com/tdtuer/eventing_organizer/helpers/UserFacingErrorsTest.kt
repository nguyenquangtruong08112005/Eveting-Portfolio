package com.tdtuer.eventing_organizer.helpers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException
import java.net.UnknownHostException

class UserFacingErrorsTest {

    @Test
    fun fromHttp_403_noRawCode() {
        val ex = UserFacingErrors.fromHttp(403, null)
        assertFalse(ex.message!!.contains("403"))
        assertTrue(ex.message!!.contains("permission", ignoreCase = true))
    }

    @Test
    fun fromHttp_jsonMessage() {
        val body = """{"message":"Ticket already checked in"}"""
        val ex = UserFacingErrors.fromHttp(400, body)
        assertEquals("Ticket already checked in", ex.message)
    }

    @Test
    fun legacyCodeString_scrubbed() {
        val msg = UserFacingErrors.toUserMessage(Exception("Error: 500"))
        assertFalse(msg.contains("500"))
    }

    @Test
    fun offline() {
        val msg = UserFacingErrors.toUserMessage(UnknownHostException())
        assertTrue(msg.contains("internet", ignoreCase = true))
    }

    @Test
    fun io() {
        val msg = UserFacingErrors.toUserMessage(IOException("x"))
        assertTrue(msg.contains("Network", ignoreCase = true))
    }
}
