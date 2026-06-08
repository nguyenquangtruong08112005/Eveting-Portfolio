const hasImportantChanges = (oldData, newData) => {
    const criticalFields = [
        'name',
        'date',
        'venueName',
        'eventType',
        'onlineUrl',
        'isOutdoor'
    ];

    for (const field of criticalFields) {
        if (JSON.stringify(oldData[field]) !== JSON.stringify(newData[field])) {
            console.log(`[EventUpdate] Detected change in field: ${field}`);
            return true;
        }
    }

    return false;
};

module.exports = {
    hasImportantChanges
};
