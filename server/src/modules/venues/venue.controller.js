// controllers/venue.controller.js
const venueService = require('./venue.service');

const getVenues = async (req, res) => {
    try {
        const venues = await venueService.getAllVenues();
        res.status(200).json(venues);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

const createVenue = async (req, res) => {
    try {
        // TODO: Add validation (name, address required)
        const newVenue = await venueService.createVenue(req.body);
        res.status(201).json(newVenue);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

module.exports = { getVenues, createVenue };
