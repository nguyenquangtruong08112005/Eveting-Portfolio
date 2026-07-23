const { Client } = require('@elastic/elasticsearch');

if (!process.env.ELASTIC_NODE_URL) {
    console.warn("Cảnh báo: ELASTIC_NODE_URL chưa được cài đặt trong .env. API tìm kiếm sẽ không hoạt động.");
    module.exports = null;
} else {
    const esClient = new Client({
        node: process.env.ELASTIC_NODE_URL
    });

    esClient.info()
        .then(response => console.log('✅ Kết nối thành công đến Elasticsearch (Self-Hosted)!'))
        .catch(error => console.error('❌ Lỗi kết nối Elasticsearch (Self-Hosted). Đảm bảo Docker đang chạy.', error));

    module.exports = esClient;
}
