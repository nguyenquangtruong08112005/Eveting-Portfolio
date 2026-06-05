// services/venue.service.js
const { v4: uuidv4 } = require('uuid');
const venueRepository = require('../../providers/database/venue.repository');

const getAllVenues = async () => {
    return venueRepository.getAllVenues();
};

const createVenue = async (venueData) => {
    // venueData: { name, addressDetails: { city, district, ward, street }, location: { lat, lng } }
    const venueId = `venue_${uuidv4()}`;
    const newVenue = {
        id: venueId,
        ...venueData,
        // Đảm bảo cấu trúc addressDetails
        addressDetails: venueData.addressDetails || {},
        location: venueData.location || null,
        seatMapTemplate: venueData.seatMapTemplate || { totalSeats: 0, layout: [] }
    };

    await venueRepository.createVenue(venueId, newVenue);
    return newVenue;
};

module.exports = {
    getAllVenues,
    createVenue
};
