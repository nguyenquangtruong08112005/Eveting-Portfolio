// services/venue.service.js
const { db } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

const getAllVenues = async () => {
    const snapshot = await db.collection('Venues').orderBy('name').get();
    const venues = [];
    snapshot.forEach(doc => {
        venues.push({ id: doc.id, ...doc.data() });
    });
    return venues;
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
    
    await db.collection('Venues').doc(venueId).set(newVenue);
    return newVenue;
};

module.exports = {
    getAllVenues,
    createVenue
};