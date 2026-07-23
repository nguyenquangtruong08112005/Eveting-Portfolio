const { v4: uuidv4 } = require('uuid');
const venueRepository = require('@/providers/database/venue.repository');

const getAllVenues = async () => {
    return venueRepository.getAllVenues();
};

const getVenueById = async (venueId) => {
    return venueRepository.getVenueById(venueId);
};

const createVenue = async (venueData) => {
    const venueId = `venue_${uuidv4()}`;
    const lat = venueData.lat ?? venueData.location?.latitude ?? venueData.location?.lat;
    const lng = venueData.lng ?? venueData.location?.longitude ?? venueData.location?.lng;

    const newVenue = {
        id: venueId,
        name: venueData.name || '',
        address: venueData.address || '',
        city: venueData.city || '',
        district: venueData.district || '',
        country: venueData.country || 'VN',
        lat: lat != null ? Number(lat) : null,
        lng: lng != null ? Number(lng) : null,
        capacity: venueData.capacity != null ? Number(venueData.capacity) : null,
        addressDetails: venueData.addressDetails || {
            street: venueData.address || '',
            city: venueData.city || '',
            district: venueData.district || '',
            ward: '',
        },
        location:
            lat != null && lng != null
                ? { latitude: Number(lat), longitude: Number(lng) }
                : venueData.location || null,
        seatMapTemplate: venueData.seatMapTemplate || { totalSeats: 0, layout: [] },
    };

    await venueRepository.createVenue(venueId, newVenue);
    return newVenue;
};

const updateVenue = async (venueId, venueData) => {
    const existing = await venueRepository.getVenueById(venueId);
    if (!existing) {
        const err = new Error('Venue not found.');
        err.statusCode = 404;
        throw err;
    }

    const lat = venueData.lat ?? venueData.location?.latitude ?? venueData.location?.lat;
    const lng = venueData.lng ?? venueData.location?.longitude ?? venueData.location?.lng;

    const patch = {
        ...venueData,
        lat: lat != null ? Number(lat) : venueData.lat,
        lng: lng != null ? Number(lng) : venueData.lng,
    };

    if (lat != null && lng != null) {
        patch.location = { latitude: Number(lat), longitude: Number(lng) };
    }

    return venueRepository.updateVenue(venueId, patch);
};

const deleteVenue = async (venueId) => {
    const existing = await venueRepository.getVenueById(venueId);
    if (!existing) {
        const err = new Error('Venue not found.');
        err.statusCode = 404;
        throw err;
    }
    await venueRepository.deleteVenue(venueId);
    return { success: true };
};

module.exports = {
    getAllVenues,
    getVenueById,
    createVenue,
    updateVenue,
    deleteVenue,
};
