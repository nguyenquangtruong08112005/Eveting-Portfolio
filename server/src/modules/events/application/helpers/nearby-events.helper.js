const geofire = require('geofire-common');
const eventRepository = require('@/providers/database/event.repository');

const findNearbyEvents = async (centerLat, centerLon, initialRadiusInKm, page = 1, limit = 10) => {
    const center = [centerLat, centerLon];
    let currentRadiusKm = initialRadiusInKm;
    const MAX_RADIUS_KM = 500;
    const RADIUS_EXPANSION_FACTOR = 2;
    const MIN_RESULTS_TARGET = limit;
    let uniqueResults = [];
    let finalRadiusUsed = currentRadiusKm;

    while (uniqueResults.length < MIN_RESULTS_TARGET && currentRadiusKm <= MAX_RADIUS_KM) {
        finalRadiusUsed = currentRadiusKm;
        const radiusInM = currentRadiusKm * 1000;
        const bounds = geofire.geohashQueryBounds(center, radiusInM);
        const matchingDocsRaw = await eventRepository.queryActivePublicEventsByGeoBounds(bounds);
        const matchingDocs = [];
        for (const { id, data } of matchingDocsRaw) {
            if (!data.location?.latitude || !data.location?.longitude) continue;
            const lat = data.location.latitude;
            const lon = data.location.longitude;
            const distanceInKm = geofire.distanceBetween([lat, lon], center);
            if (distanceInKm <= currentRadiusKm) {
                matchingDocs.push({ id, ...data, distanceKm: distanceInKm });
            }
        }
        uniqueResults = Array.from(new Map(matchingDocs.map(item => [item.id, item])).values());
        uniqueResults.sort((a, b) => a.distanceKm - b.distanceKm);
        if (uniqueResults.length >= MIN_RESULTS_TARGET || currentRadiusKm >= MAX_RADIUS_KM) break;
        currentRadiusKm *= RADIUS_EXPANSION_FACTOR;
    }

    const totalItems = uniqueResults.length;
    const totalPages = Math.ceil(totalItems / limit);
    const offset = (page - 1) * limit;
    const paginatedEvents = uniqueResults.slice(offset, offset + limit);

    const events = paginatedEvents.map(data => ({
        id: data.id, name: data.name, date: data.date, imageUrl: data.imageUrl, bannerUrl: data.bannerUrl,
        videoUrl: data.videoUrl, location: data.location, city: data.city || null, venueName: data.venueName || null,
        eventType: data.eventType || 'physical', minPrice: data.minPrice !== undefined ? data.minPrice : null,
        distanceKm: data.distanceKm
    }));

    return { events, pagination: { currentPage: page, limit: limit, totalPages: totalPages, totalItems: totalItems, actualRadiusKm: finalRadiusUsed } };
};

module.exports = {
    findNearbyEvents
};
