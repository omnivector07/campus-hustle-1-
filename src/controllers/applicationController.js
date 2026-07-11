const taskService = require('../services/taskService');
const applicationService = require('../services/applicationService');
const { sendSuccess } = require('../utils/response');
const { sanitizeText } = require('../utils/validators');

async function applyToTask(request, reply) {
  const message = request.body?.message ? sanitizeText(request.body.message) : null;
  const application = taskService.applyToTask(request.params.taskId, request.user.id, message);
  return sendSuccess(reply, { statusCode: 201, message: 'Application submitted.', data: application });
}

async function withdrawApplication(request, reply) {
  const application = taskService.withdrawApplication(request.params.id, request.user.id);
  return sendSuccess(reply, { message: 'Application withdrawn.', data: application });
}

async function listApplicantsForTask(request, reply) {
  const applications = applicationService.listApplicationsForTask(request.params.taskId, request.user.id);
  return sendSuccess(reply, { data: applications });
}

async function myApplications(request, reply) {
  const status = request.query.status;
  const applications = applicationService.listApplicationsForWorker(request.user.id, status);
  return sendSuccess(reply, { data: applications });
}

async function acceptApplication(request, reply) {
  const task = taskService.acceptApplication(request.params.id, request.user.id);
  return sendSuccess(reply, { message: 'Applicant accepted. Task assigned.', data: task });
}

module.exports = {
  applyToTask,
  withdrawApplication,
  listApplicantsForTask,
  myApplications,
  acceptApplication,
};
