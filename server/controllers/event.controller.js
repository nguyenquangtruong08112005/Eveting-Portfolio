// controllers/event.controller.js
const { db } = require('../config/firebase.config');
const eventService = require('../services/event.service');

const getAllEvents = async (req, res) => {
  try {
    const events = await eventService.getAllEvents();
    res.status(200).json(events);
  } catch (error) {
    console.error("Error in Event Controller - getAllEvents: ", error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

const getEventById = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await eventService.getEventById(eventId);

    if (!event) {
      return res.status(404).send({ error: 'Event not found' });
    }

    res.status(200).json(event);
  } catch (error) {
    console.error("Error in Event Controller - getEventById: ", error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
}

const createEvent = async (req, res) => {
  try {
    const userId = req.user.uid;

    const newEvent = await eventService.createEvent(req.body, userId);
    res.status(201).json(newEvent);

  } catch (error) {
    console.error('Error in Event controller - create Event', error);
    res.status(500).send({ error: 'Inernal Server Error' })
  }
};

const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
 
    const updatedEvent = await eventService.updateEvent(eventId, req.body);    
    res.status(200).json(updatedEvent);

  } catch (error) {
    console.error('Error in Event controller - update Event', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;

    eventService.cancelEvent(eventId);

    res.status(200).send({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error in Event controller - delete Event', error);
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

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  searchEvents,
};

