// controllers/event.controller.js
const { db } = require('../config/firebase.config'); // Vẫn cần db nếu có logic kiểm tra quyền trong controller (ví dụ: đã comment lại)
const eventService = require('../services/event.service');

const getAllEvents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    // Không cần truyền req.user vì getAllEvents mặc định chỉ lấy public
    const result = await eventService.getAllEvents(page, limit);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in Event Controller - getAllEvents: ", error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

const getEventById = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    // Truyền req.user (có thể là null nếu không đăng nhập) vào service
    // Middleware verifyAuthToken sẽ tạo req.user nếu có token hợp lệ
    const requestingUser = req.user || null; // Lấy user từ token hoặc null
    const event = await eventService.getEventById(eventId, requestingUser);
    
    if (!event) {
        // Service trả về null nếu không tìm thấy hoặc không có quyền xem
      return res.status(404).send({ error: 'Event not found or access denied.' });
    }

    res.status(200).json(event);
  } catch (error) {
    console.error("Error in Event Controller - getEventById: ", error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};


const createEvent = async (req, res) => {
  try {
    const userId = req.user.uid; // Đảm bảo middleware verifyAuthToken, isOrganizer đã chạy
    // TODO: Thêm validation cho req.body ở đây hoặc dùng middleware validator
    const newEvent = await eventService.createEvent(req.body, userId);
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error in Event controller - create Event', error);
    res.status(500).send({ error: 'Internal Server Error' }) // Sửa lỗi chính tả "Inernal"
  }
};

const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const requestingUserId = req.user.uid; // Lấy ID người yêu cầu từ token

    // --- THÊM KIỂM TRA QUYỀN SỞ HỮU TRƯỚC KHI UPDATE ---
    // Mặc dù service có thể xử lý, việc kiểm tra sớm ở controller giúp rõ ràng hơn
    const currentEvent = await eventService.getEventById(eventId, req.user); // Dùng req.user để có thể lấy cả event private/unlisted nếu là chủ
    if (!currentEvent) {
         return res.status(404).send({ error: 'Event not found or access denied.' });
    }
    // Chỉ organizer tạo ra event mới được sửa (hoặc admin sau này)
     if (currentEvent.organizerId !== requestingUserId) {
        // TODO: Kiểm tra thêm nếu user là admin
         return res.status(403).send({ error: 'Forbidden: You do not have permission to modify this event.' });
     }
    // --- KẾT THÚC KIỂM TRA QUYỀN ---

    // TODO: Thêm validation cho req.body ở đây hoặc dùng middleware validator
    const updatedEvent = await eventService.updateEvent(eventId, req.body);
    res.status(200).json(updatedEvent);
  } catch (error) {
    console.error('Error in Event controller - update Event', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

// Đổi tên hàm cho đúng với logic là "cancel" (xóa mềm)
const cancelEventController = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const requestingUserId = req.user.uid;

     // --- THÊM KIỂM TRA QUYỀN SỞ HỮU TRƯỚC KHI CANCEL ---
     const currentEvent = await eventService.getEventById(eventId, req.user);
     if (!currentEvent) {
          return res.status(404).send({ error: 'Event not found or access denied.' });
     }
      if (currentEvent.organizerId !== requestingUserId) {
         // TODO: Kiểm tra thêm nếu user là admin
          return res.status(403).send({ error: 'Forbidden: You do not have permission to cancel this event.' });
      }
     // --- KẾT THÚC KIỂM TRA QUYỀN ---

    // Gọi service và đợi kết quả trả về
    const cancelledEvent = await eventService.cancelEvent(eventId); // Thêm await

    res.status(200).json(cancelledEvent); // Trả về event đã được cập nhật status
  } catch (error) {
    console.error('Error in Event controller - cancel Event', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

const searchEvents = async (req, res) => {
  try {
    // Controller này chỉ cần truyền query vào service
    const results = await eventService.searchEvents(req.query);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error in Event controller - search Events', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
};

const findNearbyEvents = async (req, res) => {
    try {
        // Lấy các tham số từ query
        const lat = parseFloat(req.query.lat);
        const lon = parseFloat(req.query.lon);
        const radius = parseFloat(req.query.radius) || 50; // Bán kính ban đầu, mặc định 50km
        const page = parseInt(req.query.page) || 1; // Trang, mặc định 1
        const limit = parseInt(req.query.limit) || 10; // Giới hạn, mặc định 10

        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).send({ error: 'Bad Request: Valid lat and lon query parameters are required.' });
        }

        // Truyền tất cả tham số vào service
        const result = await eventService.findNearbyEvents(lat, lon, radius, page, limit);
        
        res.status(200).json(result);

    } catch (error) {
        console.error("Error in Event Controller - findNearbyEvents: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};


module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  cancelEventController, // Đổi tên export cho phù hợp
  searchEvents,
  findNearbyEvents, // <-- Export hàm mới
};