const venueService = require('@/modules/venues/application/service');

const getVenues = async (req, res) => {
    try {
        const venues = await venueService.getAllVenues();
        res.status(200).json(venues);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

const getVenueById = async (req, res) => {
    try {
        const venue = await venueService.getVenueById(req.params.id);
        if (!venue) return res.status(404).send({ error: 'Venue not found.' });
        res.status(200).json(venue);
    } catch (error) {
        res.status(error.statusCode || 500).send({ error: error.message });
    }
};

const createVenue = async (req, res) => {
    try {
        if (!req.body?.name) {
            return res.status(400).send({ error: 'Venue name is required.' });
        }
        const newVenue = await venueService.createVenue(req.body);
        res.status(201).json(newVenue);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

const updateVenue = async (req, res) => {
    try {
        const updated = await venueService.updateVenue(req.params.id, req.body || {});
        res.status(200).json(updated);
    } catch (error) {
        res.status(error.statusCode || 500).send({ error: error.message });
    }
};

const deleteVenue = async (req, res) => {
    try {
        await venueService.deleteVenue(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(error.statusCode || 500).send({ error: error.message });
    }
};

module.exports = {
    getVenues,
    getVenueById,
    createVenue,
    updateVenue,
    deleteVenue,
};
