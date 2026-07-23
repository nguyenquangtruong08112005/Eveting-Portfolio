const asyncHandler = require('@/shared/middleware/asyncHandler');
const { ForbiddenError } = require('@/shared/errors');
const mediaService = require('@/modules/media/application/service');

const getGallery = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await mediaService.getEventMedia(eventId, page, limit);
    res.status(200).json(result);
});

const uploadMedia = asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const { eventId } = req.params;
    const canUpload = await mediaService.canUploadEventMedia(userId, eventId);
    if (!canUpload) {
        throw new ForbiddenError('Only attendees or organizer can upload media.');
    }
    let files = req.files || [];
    if (!files.length && req.file) {
        files = [req.file];
    }
    if (files && files.length > 0) {
        for (const file of files) {
            if (!file.mimetype || (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/'))) {
                return res.status(400).send({ error: 'Unsupported file type. Only image/* and video/* are allowed.' });
            }
        }
        let captions = [];
        let bodyMediaItems = [];
        if (req.body.captions) {
            if (Array.isArray(req.body.captions)) {
                captions = req.body.captions;
            } else {
                try {
                    const parsed = JSON.parse(req.body.captions);
                    if (Array.isArray(parsed)) { captions = parsed; }
                    else { captions = [String(parsed)]; }
                } catch (e) { captions = [req.body.captions]; }
            }
        } else if (req.body.caption) {
            captions = [req.body.caption];
        }
        if (req.body.mediaItems) {
            try {
                const parsed = typeof req.body.mediaItems === 'string' ? JSON.parse(req.body.mediaItems) : req.body.mediaItems;
                if (Array.isArray(parsed)) { bodyMediaItems = parsed; }
            } catch (e) {}
        }
        const filesData = files.map((file, index) => {
            const caption = (bodyMediaItems[index] && bodyMediaItems[index].caption) || captions[index] || req.body.caption || '';
            return { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, caption };
        });
        const result = await mediaService.addEventMediaFiles(userId, eventId, filesData);
        return res.status(201).json(result);
    }
    const { mediaItems } = req.body;
    if (!mediaItems || !Array.isArray(mediaItems) || mediaItems.length === 0) {
        return res.status(400).send({ error: 'No media items provided.' });
    }
    const result = await mediaService.addEventMedia(userId, eventId, mediaItems);
    res.status(201).json(result);
});

module.exports = { getGallery, uploadMedia };
