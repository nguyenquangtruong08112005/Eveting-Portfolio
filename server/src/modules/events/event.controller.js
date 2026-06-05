const eventService = require('./event.service');

const getAllEvents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await eventService.getAllEvents(page, limit);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in Event Controller - getAllEvents: ", error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

const getEventById = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const requestingUser = req.user || null;
    const event = await eventService.getEventById(eventId, requestingUser);

    if (!event) {
      return res.status(404).send({ error: 'Event not found or access denied.' });
    }

    res.status(200).json(event);
  } catch (error) {
    console.error("Error in Event Controller - getEventById: ", error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};


const createEvent = async (req, res) => {
  try {
    const userId = req.user.uid;
    const newEvent = await eventService.createEvent(req.body, userId);
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error in Event controller - create Event', error);
    res.status(500).send({ error: 'Internal Server Error' })
  }
};

const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const requestingUserId = req.user.uid;

    const currentEvent = await eventService.getEventById(eventId, req.user);
    if (!currentEvent) {
      return res.status(404).send({ error: 'Event not found or access denied.' });
    }
    if (currentEvent.organizerId !== requestingUserId) {
      return res.status(403).send({ error: 'Forbidden: You do not have permission to modify this event.' });
    }

    const updatedEvent = await eventService.updateEvent(eventId, req.body);
    res.status(200).json(updatedEvent);
  } catch (error) {
    console.error('Error in Event controller - update Event', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

const cancelEventController = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const requestingUserId = req.user.uid;

    const currentEvent = await eventService.getEventById(eventId, req.user);
    if (!currentEvent) {
      return res.status(404).send({ error: 'Event not found or access denied.' });
    }
    if (currentEvent.organizerId !== requestingUserId) {
      return res.status(403).send({ error: 'Forbidden: You do not have permission to cancel this event.' });
    }

    const cancelledEvent = await eventService.cancelEvent(eventId);

    res.status(200).json(cancelledEvent);
  } catch (error) {
    console.error('Error in Event controller - cancel Event', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

const searchEvents = async (req, res) => {
  try {
    const results = await eventService.searchEvents(req.query);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error in Event controller - search Events', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

const findNearbyEvents = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const radius = parseFloat(req.query.radius) || 50;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).send({ error: 'Bad Request: Valid lat and lon query parameters are required.' });
    }

    const result = await eventService.findNearbyEvents(lat, lon, radius, page, limit);

    res.status(200).json(result);

  } catch (error) {
    console.error("Error in Event Controller - findNearbyEvents: ", error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 10;

    const events = await eventService.getRecommendations(userId, limit);
    res.status(200).json(events);
  } catch (error) {
    console.error("Error getting recommendations:", error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

const getEventWeather = async (req, res) => {
  try {
    const { eventId } = req.params;
    const weather = await eventService.getEventWeather(eventId);

    if (!weather) {
      return res.status(200).json({ message: "Weather forecast not applicable for this event." });
    }
    res.status(200).json(weather);
  } catch (error) {
    console.error("Error getting weather:", error);
    res.status(500).send({ error: error.message });
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  cancelEventController,
  searchEvents,
  findNearbyEvents,
  getRecommendations,
  getEventWeather
};
