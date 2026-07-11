const Notification = require('../models/Notification');

function notify({ userId, type, title, message, link = null }) {
  return Notification.create({ userId, type, title, message, link });
}

module.exports = { notify };
