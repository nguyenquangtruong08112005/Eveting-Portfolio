const { v4: uuidv4 } = require('uuid');
const geofire = require('geofire-common');
const venueRepository = require('@/providers/database/venue.repository');
const { BadRequestError, NotFoundError } = require('@/shared/errors');

const resolveVenueAndLocationForCreate = async (eventData) => {
    let geohash = null;
    let location = eventData.location || null;
    let venueName = null;
    let city = null;
    let onlineUrl = eventData.onlineUrl || null;
    const eventType = eventData.eventType || 'physical';
    let finalVenueId = eventData.venueId || null;

    if (eventType === 'physical') {
        if (finalVenueId) {
            const venueResult = await venueRepository.getVenueRawById(finalVenueId);
            if (venueResult.exists) {
                const venue = venueResult.data;
                venueName = venue.name;
                if (venue.addressDetails) city = venue.addressDetails.city || null;
                if (!location && venue.location) location = venue.location;
            } else {
                throw new NotFoundError(`Venue with ID ${finalVenueId} not found.`);
            }
        }
        else if (location && eventData.venueName && eventData.addressDetails) {
            const newVenueId = `venue_${uuidv4()}`;
            const lat = location.lat || location.latitude;
            const lng = location.lng || location.longitude;

            let finalAddressDetails = {};
            if (eventData.addressDetails) {
                finalAddressDetails = {
                    street: eventData.addressDetails.street || "",
                    ward: eventData.addressDetails.ward || "",
                    district: eventData.addressDetails.district || "",
                    city: eventData.addressDetails.city || "Unknown"
                };
            } else {
                finalAddressDetails = {
                    street: eventData.addressDetails || "",
                    city: eventData.addressDetails.city || "Unknown",
                    district: "",
                    ward: ""
                };
            }

            const newVenue = {
                id: newVenueId,
                name: eventData.venueName,
                addressDetails: finalAddressDetails,
                location: { latitude: lat, longitude: lng },
                seatMapTemplate: { totalSeats: 0, layout: [] }
            };

            await venueRepository.createVenue(newVenueId, newVenue);

            finalVenueId = newVenueId;
            venueName = newVenue.name;
            city = newVenue.addressDetails.city;
        }
        else {
            throw new BadRequestError('Physical event must have either a valid venueId OR full location details (name, address).');
        }

        if (location && (location.latitude || location.lat) && (location.longitude || location.lng)) {
            const lat = location.latitude || location.lat;
            const lng = location.longitude || location.lng;
            geohash = geofire.geohashForLocation([lat, lng]);
            location = { latitude: lat, longitude: lng };
        }
        onlineUrl = null;

    } else if (eventType === 'online') {
        location = null;
        geohash = null;
        venueName = "Online";
        city = "Online";
        finalVenueId = null;
        if (!onlineUrl) throw new BadRequestError('Online event must have an onlineUrl.');
    }

    return {
        geohash,
        location,
        venueName,
        city,
        onlineUrl,
        venueId: finalVenueId
    };
};

const resolveVenueAndLocationForUpdate = async (eventData, updatePayload) => {
    let geohash = undefined;
    if (eventData.location?.latitude && eventData.location?.longitude) {
        geohash = geofire.geohashForLocation([eventData.location.latitude, eventData.location.longitude]);
    }

    if (geohash !== undefined) {
        updatePayload.geohash = geohash;
    }

    if (eventData.venueId) {
        const venueResult = await venueRepository.getVenueRawById(eventData.venueId);
        if (venueResult.exists) {
            const venue = venueResult.data;
            updatePayload.venueName = venue.name;
            if (venue.addressDetails) updatePayload.city = venue.addressDetails.city || null;
            if (venue.location) {
                updatePayload.location = venue.location;
                updatePayload.geohash = geofire.geohashForLocation([venue.location.latitude, venue.location.longitude]);
            }
        }
    } else if (eventData.venueId === null) {
        updatePayload.venueName = null;
        updatePayload.city = null;
        updatePayload.location = null;
        updatePayload.geohash = null;
    }

    if (eventData.eventType === 'online') {
        updatePayload.location = null;
        updatePayload.geohash = null;
        updatePayload.venueId = null;
        updatePayload.venueName = "Online";
        updatePayload.city = "Online";
    }
};

module.exports = {
    resolveVenueAndLocationForCreate,
    resolveVenueAndLocationForUpdate
};
