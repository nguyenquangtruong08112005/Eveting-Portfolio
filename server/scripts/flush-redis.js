const { createClient } = require('redis');

(async () => {
    try {
        const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        await client.connect();
        await client.flushAll();
        console.log('Redis database flushed successfully.');
        await client.disconnect();
    } catch (err) {
        console.error('Failed to flush Redis:', err.message);
        process.exit(1);
    }
})();
