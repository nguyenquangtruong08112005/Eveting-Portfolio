const xlsx = require('xlsx');
const ExcelJS = require('exceljs');

const parseImportWorkbook = (fileBuffer) => {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    if (jsonData.length === 0) throw new Error("File is empty or invalid format.");
    return jsonData;
};

const buildExportWorkbook = (attendees) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendees');
    sheet.columns = [
        { header: 'Ticket ID', key: 'ticketId', width: 25 },
        { header: 'User Name', key: 'userName', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Ticket Type', key: 'type', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Check-in Time', key: 'checkInAt', width: 25 }
    ];
    attendees.forEach(item => {
        sheet.addRow({
            ticketId: item.ticket.id,
            userName: item.user.name,
            email: item.user.email,
            type: item.ticket.type,
            status: item.ticket.status,
            checkInAt: item.ticket.checkedInAt ? new Date(item.ticket.checkedInAt).toLocaleString() : 'Not yet'
        });
    });
    return workbook;
};

module.exports = { parseImportWorkbook, buildExportWorkbook };
