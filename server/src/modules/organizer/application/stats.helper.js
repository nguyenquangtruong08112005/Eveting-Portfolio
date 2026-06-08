const computeOrganizerStats = (eventEntries, analyticsList) => {
    let totalEvents = 0, upcomingEvents = 0, totalRevenue = 0, totalTicketsSold = 0;
    const now = new Date().getTime();
    const salesMap = {};
    const eventIds = [];
    eventEntries.forEach(entry => {
        totalEvents++;
        if (entry.date > now) upcomingEvents++;
        eventIds.push(entry.id);
    });
    if (eventIds.length > 0) {
        analyticsList.forEach(ana => {
            totalRevenue += ana.totalRevenue || 0;
            if (ana.ticketsSold) {
                Object.values(ana.ticketsSold).forEach(count => totalTicketsSold += count);
            }
            if (ana.dailySales) {
                for (const [timestampStr, count] of Object.entries(ana.dailySales)) {
                    const ts = parseInt(timestampStr);
                    const currentCount = salesMap[ts] || 0;
                    salesMap[ts] = currentCount + count;
                }
            }
        });
    }
    const salesOverTime = Object.entries(salesMap)
        .map(([timestamp, value]) => ({ timestamp: parseInt(timestamp), value }))
        .sort((a, b) => a.timestamp - b.timestamp);
    return { totalRevenue, totalTicketsSold, totalEvents, upcomingEvents };
};

module.exports = { computeOrganizerStats };
