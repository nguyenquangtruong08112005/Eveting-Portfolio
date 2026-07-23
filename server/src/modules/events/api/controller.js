const asyncHandler = require('@/shared/middleware/asyncHandler');
const { NotFoundError, ForbiddenError, BadRequestError } = require('@/shared/errors');
const eventService = require('@/modules/events/application/service');
const eventRepository = require('@/providers/database/event.repository');
const { LIFECYCLE, STATUS } = require('@/modules/events/domain/event-lifecycle');

const getAllEvents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const result = await eventService.getAllEvents(page, limit);
  res.status(200).json(result);
});

const getEventById = asyncHandler(async (req, res) => {
  const eventId = req.params.eventId;
  const requestingUser = req.user || null;
  const event = await eventService.getEventById(eventId, requestingUser);

  if (!event) {
    throw new NotFoundError('Event not found or access denied.');
  }

  res.status(200).json(event);
});


const createEvent = asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const newEvent = await eventService.createEvent(req.body, userId);
  res.status(201).json(newEvent);
});

const updateEvent = asyncHandler(async (req, res) => {
  const eventId = req.params.eventId;
  const requestingUserId = req.user.uid;

  const currentEvent = await eventService.getEventById(eventId, req.user);
  if (!currentEvent) {
    throw new NotFoundError('Event not found or access denied.');
  }
  if (currentEvent.organizerId !== requestingUserId) {
    throw new ForbiddenError('You do not have permission to modify this event.');
  }

  const updatedEvent = await eventService.updateEvent(eventId, req.body);
  res.status(200).json(updatedEvent);
});

const cancelEventController = asyncHandler(async (req, res) => {
  const eventId = req.params.eventId;
  const requestingUserId = req.user.uid;
  const roles = req.user.roles || [];

  // Use ownership row — getEventById can return null for non-public / cache edge cases
  const row = await eventRepository.getEventLifecycleOwnership(eventId);
  if (!row) {
    throw new NotFoundError('Event not found or access denied.');
  }
  const isAdmin = roles.includes('admin');
  if (row.organizer_id !== requestingUserId && !isAdmin) {
    throw new ForbiddenError('You do not have permission to cancel this event.');
  }
  if (
    row.lifecycle_status === LIFECYCLE.CANCELLED ||
    row.status === STATUS.CANCELLED
  ) {
    return res.status(200).json({
      id: eventId,
      status: STATUS.CANCELLED,
      lifecycleStatus: LIFECYCLE.CANCELLED,
      message: 'Event already cancelled.',
    });
  }

  const cancelledEvent = await eventService.cancelEvent(eventId);
  res.status(200).json(cancelledEvent);
});

const searchEvents = asyncHandler(async (req, res) => {
  const results = await eventService.searchEvents(req.query);
  res.status(200).json(results);
});

const findNearbyEvents = asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const radius = parseFloat(req.query.radius) || 50;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (isNaN(lat) || isNaN(lon)) {
    throw new BadRequestError('Valid lat and lon query parameters are required.');
  }

  const result = await eventService.findNearbyEvents(lat, lon, radius, page, limit);

  res.status(200).json(result);
});

const getRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const limit = parseInt(req.query.limit) || 10;

  const events = await eventService.getRecommendations(userId, limit);
  res.status(200).json(events);
});

const getEventWeather = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const weather = await eventService.getEventWeather(eventId);

  if (!weather) {
    return res.status(200).json({ message: "Weather forecast not applicable for this event." });
  }
  res.status(200).json(weather);
});

const submitDraftController = asyncHandler(async (req, res) => {
  const eventId = req.params.eventId;
  const result = await eventService.submitDraft(eventId, req.user.uid);
  res.status(200).json(result);
});

const getDestinations = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const destinations = await eventService.getDestinations(limit);
  res.status(200).json({ destinations });
});

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  cancelEventController,
  submitDraftController,
  searchEvents,
  findNearbyEvents,
  getRecommendations,
  getEventWeather,
  getDestinations
};
