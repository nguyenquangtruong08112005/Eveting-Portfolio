// services/media.service.js
const { db } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

/**
 * Lấy thư viện media của sự kiện
 */
const getEventMedia = async (eventId, page = 1, limit = 20) => {
    const mediaRef = db.collection('EventMedia').where('eventId', '==', eventId);
    const offset = (page - 1) * limit;

    const countSnapshot = await mediaRef.count().get();
    const totalItems = countSnapshot.data().count;

    const snapshot = await mediaRef
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

    const mediaList = [];
    for (const doc of snapshot.docs) {
        const data = doc.data();
        // Lấy thông tin người đăng
        const userDoc = await db.collection('Users').doc(data.userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        mediaList.push({
            id: doc.id,
            ...data,
            user: {
                id: userData.id,
                name: userData.name,
                profilePicUrl: userData.profilePicUrl
            }
        });
    }

    return {
        media: mediaList,
        pagination: {
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(totalItems / limit),
            totalItems: totalItems
        }
    };
};

/**
 * Lưu link media người dùng đã upload
 */
const addEventMedia = async (userId, eventId, mediaItems) => {
    // mediaItems là mảng các object: [{ url: "...", type: "image", caption: "..." }]
    const batch = db.batch();
    const createdItems = [];
    const now = new Date().getTime();

    mediaItems.forEach(item => {
        const mediaId = `media_${uuidv4()}`;
        const mediaRef = db.collection('EventMedia').doc(mediaId);
        const newMedia = {
            id: mediaId,
            userId,
            eventId,
            url: item.url,
            type: item.type || 'image', // 'image' hoặc 'video'
            caption: item.caption || '',
            createdAt: now
        };
        batch.set(mediaRef, newMedia);
        createdItems.push(newMedia);
    });

    await batch.commit();
    return createdItems;
};

module.exports = {
    getEventMedia,
    addEventMedia
};