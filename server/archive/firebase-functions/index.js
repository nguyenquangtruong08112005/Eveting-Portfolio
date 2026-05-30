// functions/index.js
const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");
const {Client} = require("@elastic/elasticsearch");
const {defineString} = require("firebase-functions/params");

admin.initializeApp();

// Định nghĩa biến môi trường
const ELASTIC_CLOUD_ID = defineString("ELASTIC_CLOUD_ID");
const ELASTIC_API_KEY = defineString("ELASTIC_API_KEY");

// Khởi tạo ES Client
let esClient;
try {
  esClient = new Client({
    cloud: {id: ELASTIC_CLOUD_ID.value()},
    auth: {apiKey: ELASTIC_API_KEY.value()},
  });
  logger.log("Elasticsearch client for Functions initialized.");
} catch (e) {
  logger.error("Failed to initialize Elasticsearch client:", e);
}

const ELASTIC_INDEX = "events";

/**
 * Lọc dữ liệu Event VÀ gộp dữ liệu FeaturedProfiles.
 * @param {object} eventData Dữ liệu thô từ Firestore.
 * @return {Promise<object>} Dữ liệu đã được lọc cho Elastic.
 */
const buildSearchData = async (eventData) => {
  // --- BẮT ĐẦU NÂNG CẤP TODO 3 ---
  let featuredProfileNames = [];
  if (eventData.featuredProfileIds && eventData.featuredProfileIds.length > 0) {
    try {
      const profilesSnapshot = await admin.firestore()
          .collection("FeaturedProfiles")
          .where("id", "in", eventData.featuredProfileIds)
          .get();
      featuredProfileNames =profilesSnapshot.docs.map((doc) => doc.data().name);
    } catch (error) {
      logger.error("Lỗi khi lấy featuredProfileNames:", error);
    }
  }
  // --- KẾT THÚC NÂNG CẤP ---

  return {
    name: eventData.name,
    description: eventData.description,
    tags: eventData.tags || [],
    city: eventData.city || null,
    category: eventData.category || [],
    minPrice: eventData.minPrice !== undefined ? eventData.minPrice : null,
    date: eventData.date,
    featuredProfileIds: eventData.featuredProfileIds || [],
    featuredProfileNames: featuredProfileNames, // <-- Thêm trường mới
    status: eventData.status,
    visibility: eventData.visibility,
    // Thêm các trường summary model khác vào đây
    imageUrl: eventData.imageUrl || null,
    bannerUrl: eventData.bannerUrl || null,
    videoUrl: eventData.videoUrl || null,
    location: eventData.location || null,
    venueName: eventData.venueName || null,
    eventType: eventData.eventType || null,
  };
};

/**
 * Lắng nghe mọi thay đổi trên collection 'Events'
 */
exports.syncEventToElastic = onDocumentWritten(
    "Events/{eventId}",
    async (event) => {
      if (!esClient) {
        logger.error("Elasticsearch client not available. Aborting sync.");
        return;
      }

      const eventId = event.params.eventId;
      const change = event.data;

      // 1. Nếu document bị xóa
      if (!change.after.exists) {
        try {
          await esClient.delete({
            index: ELASTIC_INDEX,
            id: eventId,
          });
          logger.log(`Đã xóa event khỏi Elastic: ${eventId}`);
        } catch (e) {
          logger.error(`Lỗi xóa event khỏi Elastic: ${eventId}`, e);
        }
        return;
      }

      // 2. Nếu document được tạo hoặc cập nhật
      const eventData = change.after.data();

      if (eventData.status !== "active" || eventData.visibility === "private") {
        try {
          await esClient.delete({
            index: ELASTIC_INDEX,
            id: eventId,
          });
          logger.log(
              `Event ${eventId} không public/active, đã xóa khỏi Elastic.`,
          );
        } catch (e) {
          if (e.meta.statusCode !== 404) {
            logger.error(
                `Lỗi xóa event (private/cancelled) khỏi Elastic: ${eventId}`,
                e,
            );
          }
        }
        return;
      }

      // Lọc dữ liệu (Hàm này giờ là async)
      const searchData = await buildSearchData(eventData);

      // Đẩy lên Elastic
      try {
        await esClient.index({
          index: ELASTIC_INDEX,
          id: eventId,
          body: searchData,
        });
        logger.log(`Đã đồng bộ event lên Elastic: ${eventId}`);
      } catch (e) {
        logger.error(`Lỗi đồng bộ event lên Elastic: ${eventId}`, e);
      }
    });
