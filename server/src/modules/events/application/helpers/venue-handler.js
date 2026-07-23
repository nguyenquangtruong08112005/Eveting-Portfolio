const { v4: uuidv4 } = require('uuid');
const geofire = require('geofire-common');
const venueRepository = require('@/providers/database/venue.repository');
const { BadRequestError, NotFoundError } = require('@/shared/errors');

/**
 * Resolve venue/location for event create.
 * Accepts any of:
 * 1) venueId (catalog pick)
 * 2) free-form web payload: venueName + city + location.address (no lat/lng required)
 * 3) full create with location lat/lng + venueName + addressDetails (legacy mobile)
 */
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
                city =
                    venue.city ||
                    (venue.addressDetails && venue.addressDetails.city) ||
                    eventData.city ||
                    null;
                if (!location && venue.location) location = venue.location;
                // Prefer explicit form address if catalog venue has no coords-only location
                if (eventData.location && eventData.location.address && !location?.address) {
                    location = {
                        ...(location || {}),
                        address: eventData.location.address,
                    };
                }
            } else {
                throw new NotFoundError(`Venue with ID ${finalVenueId} not found.`);
            }
        } else if (
            location &&
            eventData.venueName &&
            eventData.addressDetails &&
            (location.lat || location.latitude) &&
            (location.lng || location.longitude)
        ) {
            // Legacy full geo + addressDetails → create venue row
            const newVenueId = `venue_${uuidv4()}`;
            const lat = location.lat || location.latitude;
            const lng = location.lng || location.longitude;

            const finalAddressDetails = {
                street: eventData.addressDetails.street || '',
                ward: eventData.addressDetails.ward || '',
                district: eventData.addressDetails.district || '',
                city: eventData.addressDetails.city || eventData.city || 'Unknown',
            };

            const newVenue = {
                id: newVenueId,
                name: eventData.venueName,
                addressDetails: finalAddressDetails,
                location: { latitude: lat, longitude: lng },
                seatMapTemplate: { totalSeats: 0, layout: [] },
            };

            await venueRepository.createVenue(newVenueId, newVenue);

            finalVenueId = newVenueId;
            venueName = newVenue.name;
            city = finalAddressDetails.city;
            location = { latitude: lat, longitude: lng };
            geohash = geofire.geohashForLocation([lat, lng]);
        } else if (eventData.venueName || eventData.city || (location && location.address)) {
            // Web organizer form: free-form text venue without geo / venueId
            venueName = eventData.venueName || null;
            city = eventData.city || eventData.addressDetails?.city || null;
            if (location) {
                const lat = location.latitude || location.lat;
                const lng = location.longitude || location.lng;
                if (lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
                    geohash = geofire.geohashForLocation([Number(lat), Number(lng)]);
                    location = {
                        latitude: Number(lat),
                        longitude: Number(lng),
                        ...(location.address ? { address: location.address } : {}),
                    };
                } else {
                    // Address-only location is fine for publish pipeline
                    location = {
                        address: location.address || '',
                    };
                }
            }
            finalVenueId = null;
        } else {
            throw new BadRequestError(
                'Physical event must have a venue: pick a venueId, or provide venue name / city / address.'
            );
        }

        // Geohash when coords present (venue catalog or free-form)
        if (
            !geohash &&
            location &&
            (location.latitude || location.lat) != null &&
            (location.longitude || location.lng) != null
        ) {
            const lat = Number(location.latitude || location.lat);
            const lng = Number(location.longitude || location.lng);
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                geohash = geofire.geohashForLocation([lat, lng]);
                location = {
                    latitude: lat,
                    longitude: lng,
                    ...(location.address ? { address: location.address } : {}),
                };
            }
        }
        onlineUrl = null;
    } else if (eventType === 'online') {
        location = null;
        geohash = null;
        venueName = 'Online';
        city = 'Online';
        finalVenueId = null;
        if (!onlineUrl) throw new BadRequestError('Online event must have an onlineUrl.');
    }

    return {
        geohash,
        location,
        venueName,
        city,
        onlineUrl,
        venueId: finalVenueId,
    };
};

const resolveVenueAndLocationForUpdate = async (eventData, updatePayload) => {
    let geohash = undefined;
    if (eventData.location?.latitude && eventData.location?.longitude) {
        geohash = geofire.geohashForLocation([
            eventData.location.latitude,
            eventData.location.longitude,
        ]);
    }

    if (geohash !== undefined) {
        updatePayload.geohash = geohash;
    }

    if (eventData.venueId) {
        const venueResult = await venueRepository.getVenueRawById(eventData.venueId);
        if (venueResult.exists) {
            const venue = venueResult.data;
            updatePayload.venueName = venue.name;
            updatePayload.city =
                venue.city ||
                (venue.addressDetails && venue.addressDetails.city) ||
                eventData.city ||
                null;
            if (venue.location && (venue.location.latitude || venue.location.lat)) {
                const lat = venue.location.latitude || venue.location.lat;
                const lng = venue.location.longitude || venue.location.lng;
                updatePayload.location = { latitude: lat, longitude: lng };
                updatePayload.geohash = geofire.geohashForLocation([lat, lng]);
            }
        }
    } else if (eventData.venueId === null) {
        updatePayload.venueName = null;
        updatePayload.city = null;
        updatePayload.location = null;
        updatePayload.geohash = null;
    } else if (eventData.venueName || eventData.city || eventData.location) {
        // Free-form update from web form
        if (eventData.venueName !== undefined) updatePayload.venueName = eventData.venueName;
        if (eventData.city !== undefined) updatePayload.city = eventData.city;
        if (eventData.location !== undefined) {
            const loc = eventData.location;
            const lat = loc?.latitude || loc?.lat;
            const lng = loc?.longitude || loc?.lng;
            if (lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
                updatePayload.location = {
                    latitude: Number(lat),
                    longitude: Number(lng),
                    ...(loc.address ? { address: loc.address } : {}),
                };
                updatePayload.geohash = geofire.geohashForLocation([Number(lat), Number(lng)]);
            } else {
                updatePayload.location = loc;
            }
        }
    }

    if (eventData.eventType === 'online') {
        updatePayload.location = null;
        updatePayload.geohash = null;
        updatePayload.venueId = null;
        updatePayload.venueName = 'Online';
        updatePayload.city = 'Online';
    }
};

module.exports = {
    resolveVenueAndLocationForCreate,
    resolveVenueAndLocationForUpdate,
};
