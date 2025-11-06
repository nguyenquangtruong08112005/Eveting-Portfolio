/**
 * Tính toán giá vé thấp nhất từ map ticketTypes.
 * @param {object} ticketTypes - Map các loại vé (ví dụ: { "VIP": { price: 1000 }, ... }).
 * @returns {number|null} Giá vé thấp nhất, hoặc null nếu không có vé.
 */
const calculateMinPrice = (ticketTypes) => {
    if (!ticketTypes || typeof ticketTypes !== 'object' || Object.keys(ticketTypes).length === 0) {
        return null; // Trả về null nếu không có loại vé nào
    }
    
    // Lấy tất cả các giá và lọc ra các giá trị hợp lệ (là số)
    const prices = Object.values(ticketTypes)
        .map(type => type.price)
        .filter(price => typeof price === 'number');
    
    if (prices.length === 0) {
        return null;
    }

    // Tìm giá thấp nhất (Math.min(0, 500, 1000) sẽ là 0)
    return Math.min(...prices);
};

module.exports = {
    calculateMinPrice
}