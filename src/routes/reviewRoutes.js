const reviewController = require('../controllers/reviewController');

async function reviewRoutes(fastify) {
  fastify.get('/worker/:workerId', reviewController.listReviewsForWorker);
}

module.exports = reviewRoutes;
