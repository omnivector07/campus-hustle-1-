const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/response');

async function listMyNotifications(request, reply) {
  const unreadOnly = request.query.unread === 'true';
  const notifications = Notification.listByUser(request.user.id, { unreadOnly });
  const unreadCount = Notification.countUnread(request.user.id);
  return sendSuccess(reply, { data: { notifications, unread_count: unreadCount } });
}

async function markRead(request, reply) {
  Notification.markRead(request.params.id, request.user.id);
  return sendSuccess(reply, { message: 'Notification marked as read.' });
}

async function markAllRead(request, reply) {
  Notification.markAllRead(request.user.id);
  return sendSuccess(reply, { message: 'All notifications marked as read.' });
}

module.exports = { listMyNotifications, markRead, markAllRead };
