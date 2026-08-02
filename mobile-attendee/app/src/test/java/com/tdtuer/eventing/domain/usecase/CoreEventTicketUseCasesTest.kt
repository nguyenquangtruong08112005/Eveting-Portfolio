package com.tdtuer.eventing.domain.usecase

import android.net.Uri
import com.tdtuer.eventing.data.network.model.CheckPaymentStatusResponse
import com.tdtuer.eventing.data.network.model.CreatePaymentOrderResponse
import com.tdtuer.eventing.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing.data.network.model.PromotionResponse
import com.tdtuer.eventing.data.network.model.TicketEventSummaryDto
import com.tdtuer.eventing.data.network.model.UserTicketDto
import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.data.repository.NotificationRepository
import com.tdtuer.eventing.data.repository.TicketRepository
import com.tdtuer.eventing.domain.model.DetailedTicket
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.FilterParams
import com.tdtuer.eventing.domain.model.Notification
import com.tdtuer.eventing.domain.model.NotificationType
import com.tdtuer.eventing.domain.model.Promotion
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.model.Ticket
import com.tdtuer.eventing.domain.model.Weather
import com.tdtuer.eventing.domain.usecase.events.FindNearbyEventsUseCase
import com.tdtuer.eventing.domain.usecase.events.GetAllEventsUseCase
import com.tdtuer.eventing.domain.usecase.events.GetEventByIdUseCase
import com.tdtuer.eventing.domain.usecase.events.GetEventMediaUseCase
import com.tdtuer.eventing.domain.usecase.events.GetEventReviewsUseCase
import com.tdtuer.eventing.domain.usecase.events.GetRecommendationsUseCase
import com.tdtuer.eventing.domain.usecase.events.SearchEventsUseCase
import com.tdtuer.eventing.domain.usecase.notifications.GetNotificationsUseCase
import com.tdtuer.eventing.domain.usecase.notifications.MarkNotificationReadUseCase
import com.tdtuer.eventing.domain.usecase.payment.BookTicketUseCase
import com.tdtuer.eventing.domain.usecase.payment.CheckPaymentStatusUseCase
import com.tdtuer.eventing.domain.usecase.payment.CreateZaloPayOrderUseCase
import com.tdtuer.eventing.domain.usecase.tickets.GetTicketDetailsUseCase
import com.tdtuer.eventing.domain.usecase.tickets.GetUserTicketsUseCase
import com.tdtuer.eventing.domain.usecase.tickets.SaveTicketUseCase
import com.tdtuer.eventing.ui.screens.postevent.MediaItem
import com.tdtuer.eventing.ui.screens.postevent.ReviewItem
import com.tdtuer.eventing.ui.screens.ticket.MyTicketUiModel
import com.tdtuer.eventing.ui.screens.ticket.SaveRequest
import com.tdtuer.eventing.ui.screens.ticket.TicketStatus
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class CoreEventTicketUseCasesTest {

    // ---------------------------------------------------------------------
    // Fakes
    // ---------------------------------------------------------------------

    private class FakeEventRepository : EventRepository {
        var getAllEventsResult: Flow<Result<List<Event>>> = emptyFlow()
        var lastAllEventsPage = -1
        var lastAllEventsLimit = -1

        var getEventByIdResult: Flow<Result<Event>> = emptyFlow()
        var lastEventId: String? = null

        var findNearbyEventsResult: Flow<Result<List<Event>>> = emptyFlow()
        var lastLat: String? = null
        var lastLon: String? = null
        var lastRadius: Double? = null
        var lastNearbyPage = -1
        var lastNearbyLimit = -1

        var searchEventsResult: Flow<Result<List<Event>>> = emptyFlow()
        var lastQuery: String? = null
        var lastLocation: String? = null
        var lastCategory: String? = null
        var lastDatePreset: String? = null
        var lastStartDate: Long? = null
        var lastEndDate: Long? = null
        var lastMinPrice: Double? = null
        var lastMaxPrice: Double? = null
        var lastSortBy: String? = null
        var lastSortOrder: String? = null
        var lastHasVideo: Boolean? = null
        var lastSearchPage = -1
        var lastSearchLimit = -1

        var getEventReviewsResult: Flow<Result<List<ReviewItem>>> = emptyFlow()
        var lastReviewEventId: String? = null

        var getEventMediaResult: Flow<Result<List<MediaItem>>> = emptyFlow()
        var lastMediaEventId: String? = null

        var getRecommendationsResult: Flow<Result<List<Event>>> = emptyFlow()
        var lastRecommendationsLimit: Int? = null

        override fun getAllEvents(page: Int, limit: Int): Flow<Result<List<Event>>> {
            lastAllEventsPage = page
            lastAllEventsLimit = limit
            return getAllEventsResult
        }

        override fun getEventById(eventId: String): Flow<Result<Event>> {
            lastEventId = eventId
            return getEventByIdResult
        }

        override fun findNearbyEvents(
            lat: String,
            lon: String,
            radiusInKm: Double?,
            page: Int,
            limit: Int
        ): Flow<Result<List<Event>>> {
            lastLat = lat
            lastLon = lon
            lastRadius = radiusInKm
            lastNearbyPage = page
            lastNearbyLimit = limit
            return findNearbyEventsResult
        }

        override fun searchEvents(
            query: String?,
            location: String?,
            category: String?,
            datePreset: String?,
            startDate: Long?,
            endDate: Long?,
            minPrice: Double?,
            maxPrice: Double?,
            sortBy: String?,
            sortOrder: String?,
            page: Int,
            limit: Int,
            hasVideo: Boolean?
        ): Flow<Result<List<Event>>> {
            lastQuery = query
            lastLocation = location
            lastCategory = category
            lastDatePreset = datePreset
            lastStartDate = startDate
            lastEndDate = endDate
            lastMinPrice = minPrice
            lastMaxPrice = maxPrice
            lastSortBy = sortBy
            lastSortOrder = sortOrder
            lastSearchPage = page
            lastSearchLimit = limit
            lastHasVideo = hasVideo
            return searchEventsResult
        }

        override fun getEventReviews(eventId: String): Flow<Result<List<ReviewItem>>> {
            lastReviewEventId = eventId
            return getEventReviewsResult
        }

        override suspend fun postEventReview(eventId: String, rating: Int, comment: String): Result<Unit> =
            Result.Failure(UnsupportedOperationException())

        override fun getFeaturedProfileById(profileId: String): Flow<Result<FeaturedProfileDto>> = emptyFlow()

        override fun getEventMedia(eventId: String): Flow<Result<List<MediaItem>>> {
            lastMediaEventId = eventId
            return getEventMediaResult
        }

        override suspend fun postEventMedia(eventId: String, url: String, type: String): Result<Unit> =
            Result.Failure(UnsupportedOperationException())

        override suspend fun uploadEventMediaMultipart(eventId: String, uri: Uri): Result<Unit> =
            Result.Failure(UnsupportedOperationException())

        override fun getRecommendations(limit: Int): Flow<Result<List<Event>>> {
            lastRecommendationsLimit = limit
            return getRecommendationsResult
        }

        override fun getEventWeather(eventId: String): Flow<Result<Weather>> = emptyFlow()

        override suspend fun checkPromotion(code: String, eventId: String, quantity: Int): Result<PromotionResponse> =
            Result.Failure(UnsupportedOperationException())

        override fun getPublicPromotions(): Flow<Result<List<Promotion>>> = emptyFlow()
    }

    private class FakeTicketRepository : TicketRepository {
        var bookTicketResult: Result<Ticket> = Result.Failure(UnsupportedOperationException())
        var lastBookEventId: String? = null
        var lastBookTicketType: String? = null
        var lastBookQuantity = -1
        var lastBookPromoCode: String? = null

        var createZaloPayOrderResult: Result<CreatePaymentOrderResponse> =
            Result.Failure(UnsupportedOperationException())
        var lastCreateOrderTicketId: String? = null

        var checkPaymentStatusResult: Result<CheckPaymentStatusResponse> =
            Result.Failure(UnsupportedOperationException())
        var lastCheckTicketId: String? = null

        var getTicketDetailsResult: Result<DetailedTicket> = Result.Failure(UnsupportedOperationException())
        var lastTicketDetailsId: String? = null

        var saveTicketImagesResult: Result<Unit> = Result.Failure(UnsupportedOperationException())
        var lastSaveRequest: SaveRequest? = null

        var getUserTicketsResult: Flow<Result<List<UserTicketDto>>> = emptyFlow()
        var lastUserTicketsPage = -1
        var lastUserTicketsLimit = -1

        override suspend fun bookTicket(
            eventId: String,
            ticketType: String,
            quantity: Int,
            promoCode: String?
        ): Result<Ticket> {
            lastBookEventId = eventId
            lastBookTicketType = ticketType
            lastBookQuantity = quantity
            lastBookPromoCode = promoCode
            return bookTicketResult
        }

        override suspend fun createZaloPayOrder(ticketId: String): Result<CreatePaymentOrderResponse> {
            lastCreateOrderTicketId = ticketId
            return createZaloPayOrderResult
        }

        override suspend fun checkPaymentStatus(ticketId: String): Result<CheckPaymentStatusResponse> {
            lastCheckTicketId = ticketId
            return checkPaymentStatusResult
        }

        override suspend fun getTicketDetails(ticketId: String): Result<DetailedTicket> {
            lastTicketDetailsId = ticketId
            return getTicketDetailsResult
        }

        override suspend fun saveTicketImages(request: SaveRequest): Result<Unit> {
            lastSaveRequest = request
            return saveTicketImagesResult
        }

        override suspend fun getUserTickets(page: Int, limit: Int): Flow<Result<List<UserTicketDto>>> {
            lastUserTicketsPage = page
            lastUserTicketsLimit = limit
            return getUserTicketsResult
        }
    }

    private class FakeNotificationRepository : NotificationRepository {
        var getNotificationsResult: Flow<Result<List<Notification>>> = emptyFlow()
        var markAsReadResult: Result<Unit> = Result.Failure(UnsupportedOperationException())
        var lastMarkAsReadId: String? = null

        override fun getNotifications(): Flow<Result<List<Notification>>> = getNotificationsResult

        override suspend fun markAsRead(notificationId: String): Result<Unit> {
            lastMarkAsReadId = notificationId
            return markAsReadResult
        }
    }

    private val sampleEvent = Event(id = "evt-1", name = "Rock Night", city = "HCM")
    private val sampleTicket = Ticket(id = "tkt-1", eventId = "evt-1", type = "VIP", status = "pending")
    private val sampleDetailedTicket = DetailedTicket(
        id = "tkt-1",
        ticketType = "VIP",
        price = 100.0,
        qrCode = "qr-1",
        purchaseDate = 1700000000000L,
        status = "paid",
        eventName = "Rock Night",
        eventDate = 1700100000000L,
        eventBannerUrl = "https://example.com/banner.jpg",
        venueName = "Stadium",
        fullAddress = "123 St, Ward 1, District 2, HCM"
    )
    private val sampleNotification = Notification(
        id = "n-1",
        title = "Reminder",
        message = "Event soon",
        type = NotificationType.REMINDER,
        eventId = "evt-1",
        isRead = false,
        timeAgo = "2m"
    )
    private val sampleReview = ReviewItem("Alice", "https://example.com/a.png", 5, "Great")
    private val sampleMedia = MediaItem("https://example.com/m.jpg", "image")
    private val sampleOrder = CreatePaymentOrderResponse("zp-token", "app-id", 1, "ok")
    private val samplePaymentStatus = CheckPaymentStatusResponse("paid", "success")
    private val sampleUserTicketDto = UserTicketDto(
        id = "ut-1",
        status = "paid",
        type = "VIP",
        price = 200.0,
        seat = "A1",
        qrCode = "qr-xyz",
        purchaseDate = 1700000000000L,
        event = TicketEventSummaryDto(
            id = "evt-1",
            name = "Summer Festival",
            date = 1700100000000L,
            imageUrl = "https://example.com/img.jpg",
            venueName = "Central Park",
            city = "New York",
            status = "active"
        )
    )

    // ---------------------------------------------------------------------
    // GetAllEventsUseCase
    // ---------------------------------------------------------------------

    @Test
    fun getAllEvents_forwardsPageAndLimit_andReturnsRepositoryFlow() {
        val repo = FakeEventRepository()
        repo.getAllEventsResult = flowOf(Result.Success(listOf(sampleEvent)))
        val useCase = GetAllEventsUseCase(repo)

        val result = runBlocking { useCase(2, 25).first() }

        assertEquals(2, repo.lastAllEventsPage)
        assertEquals(25, repo.lastAllEventsLimit)
        assertTrue(result is Result.Success)
        assertEquals(listOf(sampleEvent), (result as Result.Success).data)
    }

    @Test
    fun getAllEvents_usesDefaultPageAndLimit() {
        val repo = FakeEventRepository()
        repo.getAllEventsResult = flowOf(Result.Success(emptyList()))
        val useCase = GetAllEventsUseCase(repo)

        runBlocking { useCase().first() }

        assertEquals(1, repo.lastAllEventsPage)
        assertEquals(10, repo.lastAllEventsLimit)
    }

    @Test
    fun getAllEvents_propagatesFailure() {
        val repo = FakeEventRepository()
        val ex = IllegalStateException("boom")
        repo.getAllEventsResult = flowOf(Result.Failure(ex))
        val useCase = GetAllEventsUseCase(repo)

        val result = runBlocking { useCase().first() }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    @Test
    fun getAllEvents_propagatesLoading() {
        val repo = FakeEventRepository()
        repo.getAllEventsResult = flowOf(Result.Loading)
        val useCase = GetAllEventsUseCase(repo)

        val result = runBlocking { useCase().first() }

        assertSame(Result.Loading, result)
    }

    // ---------------------------------------------------------------------
    // GetEventByIdUseCase
    // ---------------------------------------------------------------------

    @Test
    fun getEventById_forwardsEventId_andReturnsRepositoryFlow() {
        val repo = FakeEventRepository()
        repo.getEventByIdResult = flowOf(Result.Success(sampleEvent))
        val useCase = GetEventByIdUseCase(repo)

        val result = runBlocking { useCase("evt-1").first() }

        assertEquals("evt-1", repo.lastEventId)
        assertTrue(result is Result.Success)
        assertEquals(sampleEvent, (result as Result.Success).data)
    }

    @Test
    fun getEventById_propagatesFailure() {
        val repo = FakeEventRepository()
        val ex = IllegalStateException("boom")
        repo.getEventByIdResult = flowOf(Result.Failure(ex))
        val useCase = GetEventByIdUseCase(repo)

        val result = runBlocking { useCase("evt-1").first() }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    // ---------------------------------------------------------------------
    // GetRecommendationsUseCase
    // ---------------------------------------------------------------------

    @Test
    fun getRecommendations_returnsRepositoryFlow_ignoresLimitParam() {
        val repo = FakeEventRepository()
        repo.getRecommendationsResult = flowOf(Result.Success(listOf(sampleEvent)))
        val useCase = GetRecommendationsUseCase(repo)

        val result = runBlocking { useCase(5).first() }

        assertEquals(10, repo.lastRecommendationsLimit)
        assertTrue(result is Result.Success)
        assertEquals(listOf(sampleEvent), (result as Result.Success).data)
    }

    @Test
    fun getRecommendations_propagatesFailure() {
        val repo = FakeEventRepository()
        val ex = IllegalStateException("boom")
        repo.getRecommendationsResult = flowOf(Result.Failure(ex))
        val useCase = GetRecommendationsUseCase(repo)

        val result = runBlocking { useCase(5).first() }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    // ---------------------------------------------------------------------
    // SearchEventsUseCase
    // ---------------------------------------------------------------------

    @Test
    fun searchEvents_forwardsAllTranslatedParams() {
        val repo = FakeEventRepository()
        repo.searchEventsResult = flowOf(Result.Success(listOf(sampleEvent)))
        val useCase = SearchEventsUseCase(repo)
        val params = FilterParams(
            query = "rock",
            categories = setOf("Music", "Rock"),
            datePreset = "this_week",
            customDateRange = 1000L to 2000L,
            location = "HCM",
            priceRange = 10.0 to 50.0,
            hasVideo = true,
            sortBy = "date",
            sortOrder = "desc",
            page = 3,
            limit = 15
        )

        val result = runBlocking { useCase(params).first() }

        assertEquals("rock", repo.lastQuery)
        assertEquals("HCM", repo.lastLocation)
        assertEquals("Music", repo.lastCategory)
        assertEquals("this_week", repo.lastDatePreset)
        assertEquals(1000L, repo.lastStartDate)
        assertEquals(2000L, repo.lastEndDate)
        assertEquals(10.0, repo.lastMinPrice)
        assertEquals(50.0, repo.lastMaxPrice)
        assertEquals("date", repo.lastSortBy)
        assertEquals("desc", repo.lastSortOrder)
        assertEquals(true, repo.lastHasVideo)
        assertEquals(3, repo.lastSearchPage)
        assertEquals(15, repo.lastSearchLimit)
        assertTrue(result is Result.Success)
        assertEquals(listOf(sampleEvent), (result as Result.Success).data)
    }

    @Test
    fun searchEvents_forwardsNullsWhenFieldsMissing() {
        val repo = FakeEventRepository()
        repo.searchEventsResult = flowOf(Result.Success(listOf(sampleEvent)))
        val useCase = SearchEventsUseCase(repo)

        runBlocking { useCase(FilterParams()).first() }

        assertNull(repo.lastQuery)
        assertNull(repo.lastLocation)
        assertNull(repo.lastCategory)
        assertNull(repo.lastDatePreset)
        assertNull(repo.lastStartDate)
        assertNull(repo.lastEndDate)
        assertNull(repo.lastMinPrice)
        assertNull(repo.lastMaxPrice)
        assertNull(repo.lastSortBy)
        assertNull(repo.lastSortOrder)
        assertNull(repo.lastHasVideo)
        assertEquals(1, repo.lastSearchPage)
        assertEquals(20, repo.lastSearchLimit)
    }

    @Test
    fun searchEvents_propagatesFailure() {
        val repo = FakeEventRepository()
        val ex = IllegalStateException("boom")
        repo.searchEventsResult = flowOf(Result.Failure(ex))
        val useCase = SearchEventsUseCase(repo)

        val result = runBlocking { useCase(FilterParams()).first() }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    // ---------------------------------------------------------------------
    // FindNearbyEventsUseCase
    // ---------------------------------------------------------------------

    @Test
    fun findNearbyEvents_forwardsLocationRadiusPageLimit() {
        val repo = FakeEventRepository()
        repo.findNearbyEventsResult = flowOf(Result.Success(listOf(sampleEvent)))
        val useCase = FindNearbyEventsUseCase(repo)

        val result = runBlocking { useCase("10.5", "106.6", 3.5, limit = 7, page = 2).first() }

        assertEquals("10.5", repo.lastLat)
        assertEquals("106.6", repo.lastLon)
        assertEquals(3.5, repo.lastRadius)
        assertEquals(2, repo.lastNearbyPage)
        assertEquals(7, repo.lastNearbyLimit)
        assertTrue(result is Result.Success)
        assertEquals(listOf(sampleEvent), (result as Result.Success).data)
    }

    @Test
    fun findNearbyEvents_usesDefaultPageAndLimit() {
        val repo = FakeEventRepository()
        repo.findNearbyEventsResult = flowOf(Result.Success(emptyList()))
        val useCase = FindNearbyEventsUseCase(repo)

        runBlocking { useCase("10.5", "106.6", 3.5).first() }

        assertEquals(1, repo.lastNearbyPage)
        assertEquals(10, repo.lastNearbyLimit)
    }

    @Test
    fun findNearbyEvents_propagatesFailure() {
        val repo = FakeEventRepository()
        val ex = IllegalStateException("boom")
        repo.findNearbyEventsResult = flowOf(Result.Failure(ex))
        val useCase = FindNearbyEventsUseCase(repo)

        val result = runBlocking { useCase("10.5", "106.6", 3.5).first() }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    // ---------------------------------------------------------------------
    // GetEventReviewsUseCase
    // ---------------------------------------------------------------------

    @Test
    fun getEventReviews_forwardsEventId_andReturnsRepositoryFlow() {
        val repo = FakeEventRepository()
        repo.getEventReviewsResult = flowOf(Result.Success(listOf(sampleReview)))
        val useCase = GetEventReviewsUseCase(repo)

        val result = runBlocking { useCase("evt-1").first() }

        assertEquals("evt-1", repo.lastReviewEventId)
        assertTrue(result is Result.Success)
        assertEquals(listOf(sampleReview), (result as Result.Success).data)
    }

    @Test
    fun getEventReviews_propagatesFailure() {
        val repo = FakeEventRepository()
        val ex = IllegalStateException("boom")
        repo.getEventReviewsResult = flowOf(Result.Failure(ex))
        val useCase = GetEventReviewsUseCase(repo)

        val result = runBlocking { useCase("evt-1").first() }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    // ---------------------------------------------------------------------
    // GetEventMediaUseCase
    // ---------------------------------------------------------------------

    @Test
    fun getEventMedia_forwardsEventId_andReturnsRepositoryFlow() {
        val repo = FakeEventRepository()
        repo.getEventMediaResult = flowOf(Result.Success(listOf(sampleMedia)))
        val useCase = GetEventMediaUseCase(repo)

        val result = runBlocking { useCase("evt-1").first() }

        assertEquals("evt-1", repo.lastMediaEventId)
        assertTrue(result is Result.Success)
        assertEquals(listOf(sampleMedia), (result as Result.Success).data)
    }

    @Test
    fun getEventMedia_propagatesFailure() {
        val repo = FakeEventRepository()
        val ex = IllegalStateException("boom")
        repo.getEventMediaResult = flowOf(Result.Failure(ex))
        val useCase = GetEventMediaUseCase(repo)

        val result = runBlocking { useCase("evt-1").first() }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    // ---------------------------------------------------------------------
    // GetUserTicketsUseCase
    // ---------------------------------------------------------------------

    @Test
    fun getUserTickets_forwardsPageAndLimit_andMapsSuccessToUiModel() {
        val repo = FakeTicketRepository()
        repo.getUserTicketsResult = flowOf(Result.Success(listOf(sampleUserTicketDto)))
        val useCase = GetUserTicketsUseCase(repo)

        val result = runBlocking { useCase(2, 25).first() }

        assertEquals(2, repo.lastUserTicketsPage)
        assertEquals(25, repo.lastUserTicketsLimit)
        assertTrue(result is Result.Success)
        val uiModel = (result as Result.Success).data.single()
        assertEquals("ut-1", uiModel.ticketId)
        assertEquals("evt-1", uiModel.eventId)
        assertEquals("Summer Festival", uiModel.eventName)
        assertEquals("VIP", uiModel.ticketType)
        assertEquals(TicketStatus.PAID, uiModel.status)
        assertEquals(200.0, uiModel.price, 0.001)
        assertEquals("Central Park, New York", uiModel.location)
    }

    @Test
    fun getUserTickets_usesDefaultPageAndLimit() {
        val repo = FakeTicketRepository()
        repo.getUserTicketsResult = flowOf(Result.Success(emptyList()))
        val useCase = GetUserTicketsUseCase(repo)

        runBlocking { useCase().first() }

        assertEquals(1, repo.lastUserTicketsPage)
        assertEquals(20, repo.lastUserTicketsLimit)
    }

    @Test
    fun getUserTickets_propagatesFailure() {
        val repo = FakeTicketRepository()
        val ex = IllegalStateException("boom")
        repo.getUserTicketsResult = flowOf(Result.Failure(ex))
        val useCase = GetUserTicketsUseCase(repo)

        val result = runBlocking { useCase().first() }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    @Test
    fun getUserTickets_propagatesLoading() {
        val repo = FakeTicketRepository()
        repo.getUserTicketsResult = flowOf(Result.Loading)
        val useCase = GetUserTicketsUseCase(repo)

        val result = runBlocking { useCase().first() }

        assertSame(Result.Loading, result)
    }

    // ---------------------------------------------------------------------
    // GetTicketDetailsUseCase
    // ---------------------------------------------------------------------

    @Test
    fun getTicketDetails_forwardsTicketId_andReturnsResult() {
        val repo = FakeTicketRepository()
        repo.getTicketDetailsResult = Result.Success(sampleDetailedTicket)
        val useCase = GetTicketDetailsUseCase(repo)

        val result = runBlocking { useCase("tkt-1") }

        assertEquals("tkt-1", repo.lastTicketDetailsId)
        assertTrue(result is Result.Success)
        assertEquals(sampleDetailedTicket, (result as Result.Success).data)
    }

    @Test
    fun getTicketDetails_propagatesFailure() {
        val repo = FakeTicketRepository()
        val ex = IllegalStateException("boom")
        repo.getTicketDetailsResult = Result.Failure(ex)
        val useCase = GetTicketDetailsUseCase(repo)

        val result = runBlocking { useCase("tkt-1") }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    // ---------------------------------------------------------------------
    // SaveTicketUseCase
    // ---------------------------------------------------------------------

    @Test
    fun saveTicket_forwardsRequest_andReturnsResult() {
        val repo = FakeTicketRepository()
        repo.saveTicketImagesResult = Result.Success(Unit)
        val useCase = SaveTicketUseCase(repo)
        val request = SaveRequest("qr-data", "Rock Night", "tkt-1")

        val result = runBlocking { useCase(request) }

        assertEquals(request, repo.lastSaveRequest)
        assertTrue(result is Result.Success)
        assertEquals(Unit, (result as Result.Success).data)
    }

    @Test
    fun saveTicket_propagatesFailure() {
        val repo = FakeTicketRepository()
        val ex = IllegalStateException("boom")
        repo.saveTicketImagesResult = Result.Failure(ex)
        val useCase = SaveTicketUseCase(repo)

        val result = runBlocking { useCase(SaveRequest("qr-data", "Rock Night", "tkt-1")) }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    // ---------------------------------------------------------------------
    // GetNotificationsUseCase
    // ---------------------------------------------------------------------

    @Test
    fun getNotifications_returnsRepositoryFlow() {
        val repo = FakeNotificationRepository()
        repo.getNotificationsResult = flowOf(Result.Success(listOf(sampleNotification)))
        val useCase = GetNotificationsUseCase(repo)

        val result = runBlocking { useCase().first() }

        assertTrue(result is Result.Success)
        assertEquals(listOf(sampleNotification), (result as Result.Success).data)
    }

    @Test
    fun getNotifications_propagatesFailure() {
        val repo = FakeNotificationRepository()
        val ex = IllegalStateException("boom")
        repo.getNotificationsResult = flowOf(Result.Failure(ex))
        val useCase = GetNotificationsUseCase(repo)

        val result = runBlocking { useCase().first() }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    // ---------------------------------------------------------------------
    // MarkNotificationReadUseCase
    // ---------------------------------------------------------------------

    @Test
    fun markNotificationRead_forwardsNotificationId_andReturnsResult() {
        val repo = FakeNotificationRepository()
        repo.markAsReadResult = Result.Success(Unit)
        val useCase = MarkNotificationReadUseCase(repo)

        val result = runBlocking { useCase("n-1") }

        assertEquals("n-1", repo.lastMarkAsReadId)
        assertTrue(result is Result.Success)
        assertEquals(Unit, (result as Result.Success).data)
    }

    @Test
    fun markNotificationRead_propagatesFailure() {
        val repo = FakeNotificationRepository()
        val ex = IllegalStateException("boom")
        repo.markAsReadResult = Result.Failure(ex)
        val useCase = MarkNotificationReadUseCase(repo)

        val result = runBlocking { useCase("n-1") }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    // ---------------------------------------------------------------------
    // BookTicketUseCase
    // ---------------------------------------------------------------------

    @Test
    fun bookTicket_forwardsAllParams() {
        val repo = FakeTicketRepository()
        repo.bookTicketResult = Result.Success(sampleTicket)
        val useCase = BookTicketUseCase(repo)

        val result = runBlocking { useCase("evt-1", "VIP", promoCode = "PROMO10", quantity = 3) }

        assertEquals("evt-1", repo.lastBookEventId)
        assertEquals("VIP", repo.lastBookTicketType)
        assertEquals(3, repo.lastBookQuantity)
        assertEquals("PROMO10", repo.lastBookPromoCode)
        assertTrue(result is Result.Success)
        assertEquals(sampleTicket, (result as Result.Success).data)
    }

    @Test
    fun bookTicket_usesDefaultPromoCodeAndQuantity() {
        val repo = FakeTicketRepository()
        repo.bookTicketResult = Result.Success(sampleTicket)
        val useCase = BookTicketUseCase(repo)

        runBlocking { useCase("evt-1", "VIP") }

        assertEquals(1, repo.lastBookQuantity)
        assertNull(repo.lastBookPromoCode)
    }

    @Test
    fun bookTicket_propagatesFailure() {
        val repo = FakeTicketRepository()
        val ex = IllegalStateException("boom")
        repo.bookTicketResult = Result.Failure(ex)
        val useCase = BookTicketUseCase(repo)

        val result = runBlocking { useCase("evt-1", "VIP") }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    // ---------------------------------------------------------------------
    // CreateZaloPayOrderUseCase
    // ---------------------------------------------------------------------

    @Test
    fun createZaloPayOrder_forwardsTicketId_andReturnsResult() {
        val repo = FakeTicketRepository()
        repo.createZaloPayOrderResult = Result.Success(sampleOrder)
        val useCase = CreateZaloPayOrderUseCase(repo)

        val result = runBlocking { useCase("tkt-1") }

        assertEquals("tkt-1", repo.lastCreateOrderTicketId)
        assertTrue(result is Result.Success)
        assertEquals(sampleOrder, (result as Result.Success).data)
    }

    @Test
    fun createZaloPayOrder_propagatesFailure() {
        val repo = FakeTicketRepository()
        val ex = IllegalStateException("boom")
        repo.createZaloPayOrderResult = Result.Failure(ex)
        val useCase = CreateZaloPayOrderUseCase(repo)

        val result = runBlocking { useCase("tkt-1") }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }

    // ---------------------------------------------------------------------
    // CheckPaymentStatusUseCase
    // ---------------------------------------------------------------------

    @Test
    fun checkPaymentStatus_forwardsTicketId_andReturnsResult() {
        val repo = FakeTicketRepository()
        repo.checkPaymentStatusResult = Result.Success(samplePaymentStatus)
        val useCase = CheckPaymentStatusUseCase(repo)

        val result = runBlocking { useCase("tkt-1") }

        assertEquals("tkt-1", repo.lastCheckTicketId)
        assertTrue(result is Result.Success)
        assertEquals(samplePaymentStatus, (result as Result.Success).data)
    }

    @Test
    fun checkPaymentStatus_propagatesFailure() {
        val repo = FakeTicketRepository()
        val ex = IllegalStateException("boom")
        repo.checkPaymentStatusResult = Result.Failure(ex)
        val useCase = CheckPaymentStatusUseCase(repo)

        val result = runBlocking { useCase("tkt-1") }

        assertTrue(result is Result.Failure)
        assertSame(ex, (result as Result.Failure).exception)
    }
}
