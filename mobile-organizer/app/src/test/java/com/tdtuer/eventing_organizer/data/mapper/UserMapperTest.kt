package com.tdtuer.eventing_organizer.data.mapper

import com.tdtuer.eventing_organizer.data.network.model.JoinedEventDto
import com.tdtuer.eventing_organizer.data.network.model.UserDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class UserMapperTest {

    @Test
    fun `UserDto with all fields populated maps correctly`() {
        val dto = UserDto(
            id = "usr-001",
            email = "alice@example.com",
            userName = "Alice",
            profilePicUrl = "https://example.com/avatar.jpg",
            coverPhotoUrl = "https://example.com/cover.jpg",
            isOrganizer = true,
            isAdmin = false,
            followingCount = 42,
            followersCount = 7,
            aboutMe = "Hello, I am Alice!",
            interests = listOf("coding", "music"),
            joinedEvents = listOf(
                JoinedEventDto(
                    id = "evt-001",
                    name = "Kotlin Conf",
                    date = 1700000000000L,
                    imageUrl = "https://example.com/evt1.jpg"
                ),
                JoinedEventDto(
                    id = "evt-002",
                    name = "Android Dev Summit",
                    date = 1700100000000L,
                    imageUrl = "https://example.com/evt2.jpg"
                )
            ),
            birthDate = 946684800000L,
            address = "123 Main St",
            emailVerified = true
        )

        val user = dto.toDomainModel()

        assertEquals("usr-001", user.id)
        assertEquals("alice@example.com", user.email)
        assertEquals("Alice", user.name)
        assertEquals("https://example.com/avatar.jpg", user.profilePicUrl)
        assertEquals("https://example.com/cover.jpg", user.coverPhotoUrl)
        assertEquals(true, user.isOrganizer)
        assertEquals(false, user.isAdmin)
        assertEquals("Hello, I am Alice!", user.bio)
        assertEquals(946684800000L, user.birthDate)
        assertEquals("123 Main St", user.address)
        assertEquals(listOf("coding", "music"), user.interests)
        assertEquals(7, user.followersCount)
        assertEquals(42, user.followingCount)

        assertEquals(2, user.joinedEvents.size)
        with(user.joinedEvents[0]) {
            assertEquals("evt-001", id)
            assertEquals("Kotlin Conf", name)
            assertEquals(1700000000000L, date)
            assertEquals("https://example.com/evt1.jpg", imageUrl)
        }
        with(user.joinedEvents[1]) {
            assertEquals("evt-002", id)
            assertEquals("Android Dev Summit", name)
            assertEquals(1700100000000L, date)
            assertEquals("https://example.com/evt2.jpg", imageUrl)
        }
    }

    @Test
    fun `UserDto with all nulls uses defaults`() {
        val dto = UserDto(
            id = null, email = null, userName = null,
            profilePicUrl = null, coverPhotoUrl = null,
            isOrganizer = null, isAdmin = null,
            followingCount = null, followersCount = null,
            aboutMe = null, interests = null,
            joinedEvents = null, birthDate = null,
            address = null, emailVerified = null
        )

        val user = dto.toDomainModel()

        assertEquals("", user.id)
        assertEquals("", user.email)
        assertEquals("", user.name)
        assertEquals("", user.profilePicUrl)
        assertEquals("", user.coverPhotoUrl)
        assertEquals(false, user.isOrganizer)
        assertEquals(false, user.isAdmin)
        assertEquals("", user.bio)
        assertEquals(0L, user.birthDate)
        assertEquals("", user.address)
        assertEquals(emptyList<String>(), user.interests)
        assertEquals(0, user.followersCount)
        assertEquals(0, user.followingCount)
        assertTrue(user.joinedEvents.isEmpty())
    }

    @Test
    fun `UserDto with empty joinedEvents list maps to empty list`() {
        val dto = UserDto(
            id = null, email = null, userName = null,
            profilePicUrl = null, coverPhotoUrl = null,
            isOrganizer = null, isAdmin = null,
            followingCount = null, followersCount = null,
            aboutMe = null, interests = null,
            joinedEvents = emptyList(), birthDate = null,
            address = null, emailVerified = null
        )

        val user = dto.toDomainModel()

        assertTrue(user.joinedEvents.isEmpty())
    }

    @Test
    fun `JoinedEventDto with all fields populated maps correctly`() {
        val dto = JoinedEventDto(
            id = "evt-100",
            name = "Hackathon",
            date = 1700200000000L,
            imageUrl = "https://example.com/hack.jpg"
        )

        val event = dto.toDomainModel()

        assertEquals("evt-100", event.id)
        assertEquals("Hackathon", event.name)
        assertEquals(1700200000000L, event.date)
        assertEquals("https://example.com/hack.jpg", event.imageUrl)
    }

    @Test
    fun `JoinedEventDto with all nulls uses defaults`() {
        val dto = JoinedEventDto(
            id = null, name = null, date = null, imageUrl = null
        )

        val event = dto.toDomainModel()

        assertEquals("", event.id)
        assertEquals("", event.name)
        assertEquals(0L, event.date)
        assertEquals("", event.imageUrl)
    }
}
