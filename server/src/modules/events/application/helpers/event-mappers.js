const featuredProfileRepository = require('@/providers/database/featuredProfile.repository');

const mapPublicTicketTypes = (ticketTypes) => {
    if (!ticketTypes) return {};
    const publicTypes = {};
    for (const key in ticketTypes) {
        publicTypes[key] = { price: ticketTypes[key].price };
    } return publicTypes;
};

const mapPublicVenue = (venueData) => {
    if (!venueData) return null;
    const { seatMapTemplate, ...publicVenue } = venueData;
    return publicVenue;
};

const buildElasticData = async (eventData) => {
    let featuredProfileNames = [];
    if (eventData.featuredProfileIds && eventData.featuredProfileIds.length > 0) {
        try {
            featuredProfileNames = await featuredProfileRepository.getFeaturedProfileNamesByIds(eventData.featuredProfileIds);
        } catch (error) {
            console.error(`Lỗi lấy profile names cho event ${eventData.id}:`, error);
        }
    }
    const data = {
        name: eventData.name || null,
        description: eventData.description || null,
        tags: eventData.tags || [],
        city: eventData.city || null,
        category: eventData.category || [],
        minPrice: eventData.minPrice !== undefined ? eventData.minPrice : null,
        date: eventData.date || null,
        featuredProfileIds: eventData.featuredProfileIds || [],
        featuredProfileNames: featuredProfileNames,
        status: eventData.status || null,
        visibility: eventData.visibility || null,
        imageUrl: eventData.imageUrl || null,
        bannerUrl: eventData.bannerUrl || null,
        videoUrl: eventData.videoUrl || null,
        location: eventData.location || null,
        venueName: eventData.venueName || null,
        eventType: eventData.eventType || null,
    };
    Object.keys(data).forEach(key => { if (data[key] === undefined) data[key] = null; });
    return data;
};

module.exports = {
    mapPublicTicketTypes,
    mapPublicVenue,
    buildElasticData
};
