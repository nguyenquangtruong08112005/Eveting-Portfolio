package com.tdtuer.eventing.data.mapper

import com.tdtuer.eventing.data.network.model.JoinedEventDto
import com.tdtuer.eventing.data.network.model.UserDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class UserMapperTest {

    @Test
    fun userDto_toDomainModel_mapsAllFields() {
        val dto = UserDto(
            id = "user-1",
            email = "test@example.com",
            userName = "john_doe",
            profilePicUrl = "https://example.com/avatar.jpg",
            coverPhotoUrl = "https://example.com/cover.jpg",
            isOrganizer = true,
            followingCount = 42,
            followersCount = 100,
            aboutMe = "Event enthusiast",
            interests = listOf("Music", "Tech"),
            joinedEvents = listOf(
                JoinedEventDto(id = "evt-1", name = "Concert", date = 1700000000000L, imageUrl = "img1.jpg"),
                JoinedEventDto(id = "evt-2", name = "Workshop", date = 1800000000000L, imageUrl = "img2.jpg")
            ),
            birthDate = 946684800000L,
            address = "123 Main St",
            followedProfileIds = listOf("prof-1", "prof-2"),
            emailVerified = true
        )

        val domain = dto.toDomainModel()

        assertEquals("user-1", domain.id)
        assertEquals("test@example.com", domain.email)
        assertEquals("john_doe", domain.name)
        assertEquals("https://example.com/avatar.jpg", domain.profilePicUrl)
        assertEquals("https://example.com/cover.jpg", domain.coverPhotoUrl)
        assertEquals(true, domain.isOrganizer)
        assertEquals(100, domain.followersCount)
        assertEquals(42, domain.followingCount)
        assertEquals("Event enthusiast", domain.bio)
        assertEquals(listOf("Music", "Tech"), domain.interests)
        assertEquals(946684800000L, domain.birthDate)
        assertEquals("123 Main St", domain.address)
        assertEquals(listOf("prof-1", "prof-2"), domain.followedProfileIds)
        assertEquals(2, domain.joinedEvents.size)
        assertEquals("Concert", domain.joinedEvents[0].name)
        assertEquals("Workshop", domain.joinedEvents[1].name)
        assertTrue(domain.fcmTokens.isEmpty())
    }

    @Test
    fun userDto_toDomainModel_nullFields_usesDefaults() {
        val dto = UserDto(
            id = null, email = null, userName = null,
            profilePicUrl = null, coverPhotoUrl = null,
            isOrganizer = null, followingCount = null, followersCount = null,
            aboutMe = null, interests = null, joinedEvents = null,
            birthDate = null, address = null, followedProfileIds = null,
            emailVerified = null
        )

        val domain = dto.toDomainModel()

        assertEquals("", domain.id)
        assertEquals("", domain.email)
        assertEquals("", domain.name)
        assertEquals("", domain.profilePicUrl)
        assertEquals("", domain.coverPhotoUrl)
        assertEquals(false, domain.isOrganizer)
        assertEquals(0, domain.followersCount)
        assertEquals(0, domain.followingCount)
        assertEquals("", domain.bio)
        assertTrue(domain.interests.isEmpty())
        assertTrue(domain.joinedEvents.isEmpty())
        assertEquals(0L, domain.birthDate)
        assertEquals("", domain.address)
        assertTrue(domain.followedProfileIds.isEmpty())
    }

    @Test
    fun joinedEventDto_toDomainModel_mapsAllFields() {
        val dto = JoinedEventDto(
            id = "evt-99",
            name = "Music Fest",
            date = 1700000000000L,
            imageUrl = "https://example.com/fest.jpg"
        )

        val domain = dto.toDomainModel()

        assertEquals("evt-99", domain.id)
        assertEquals("Music Fest", domain.name)
        assertEquals(1700000000000L, domain.date)
        assertEquals("https://example.com/fest.jpg", domain.imageUrl)
    }

    @Test
    fun joinedEventDto_toDomainModel_nullFields_usesDefaults() {
        val dto = JoinedEventDto(
            id = null,
            name = null,
            date = null,
            imageUrl = null
        )

        val domain = dto.toDomainModel()

        assertEquals("", domain.id)
        assertEquals("", domain.name)
        assertEquals(0L, domain.date)
        assertEquals("", domain.imageUrl)
    }

    @Test
    fun userDto_toDomainModel_nonNullEmptyCollections() {
        val dto = UserDto(
            id = "u-empty", email = "a@b.com", userName = "tester",
            profilePicUrl = "", coverPhotoUrl = "",
            isOrganizer = false, followingCount = 0, followersCount = 0,
            aboutMe = "", interests = emptyList(), joinedEvents = emptyList(),
            birthDate = 0L, address = "", followedProfileIds = emptyList(),
            emailVerified = null
        )
        val domain = dto.toDomainModel()
        assertEquals("u-empty", domain.id)
        assertEquals("tester", domain.name)
        assertTrue(domain.interests.isEmpty())
        assertTrue(domain.joinedEvents.isEmpty())
        assertTrue(domain.followedProfileIds.isEmpty())
        assertEquals(0, domain.followersCount)
        assertEquals(0, domain.followingCount)
    }

    @Test
    fun joinedEventDto_toDomainModel_mixedNulls() {
        val dto = JoinedEventDto(
            id = "evt-mix",
            name = null,
            date = 1000L,
            imageUrl = null
        )
        val domain = dto.toDomainModel()
        assertEquals("evt-mix", domain.id)
        assertEquals("", domain.name)
        assertEquals(1000L, domain.date)
        assertEquals("", domain.imageUrl)
    }
}
