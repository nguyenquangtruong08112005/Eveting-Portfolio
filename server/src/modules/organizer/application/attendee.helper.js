const mapAttendees = (tickets, usersMap) => {
    if (tickets.length === 0) return [];
    const userIds = new Set();
    tickets.forEach(ticket => { if (ticket.userId) userIds.add(ticket.userId); });
    if (userIds.size === 0) return [];
    const attendees = tickets.map(ticket => {
        const user = usersMap[ticket.userId] || { name: 'Unknown User', email: 'N/A' };
        return {
            ticket: { id: ticket.id, type: ticket.type, seat: ticket.seat, status: ticket.status, purchaseDate: ticket.purchaseDate },
            user: { id: ticket.userId, name: user.name, email: user.email, profilePicUrl: user.profilePicUrl }
        };
    });
    return attendees;
};

module.exports = { mapAttendees };
