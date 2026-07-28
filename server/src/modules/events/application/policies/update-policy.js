const logger = require('@/shared/logger');

const hasImportantChanges = (oldData, newData) => {
    const criticalFields = [
        'name',
        'date',
        'venueName',
        'eventType',
        'onlineUrl',
        'isOutdoor',
        'provinceName',
        'districtName',
        'wardName',
        'streetAddress'
    ];

    for (const field of criticalFields) {
        if (JSON.stringify(oldData[field]) !== JSON.stringify(newData[field])) {
            logger.info('Important event field changed', { field });
            return true;
        }
    }

    return false;
};

module.exports = {
    hasImportantChanges
};
