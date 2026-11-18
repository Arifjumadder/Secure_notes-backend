const mongoose = require('mongoose');

exports.asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

exports.pageMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.max(Math.ceil(total / limit), 1),
});

exports.isObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id));
exports.toObjectId = (id) => new mongoose.Types.ObjectId(id);

// router.param(...) helper
exports.validateId = (req, res, next, id) =>
  exports.isObjectId(id) ? next() : res.status(400).json({ message: 'Invalid id' });

exports.httpError = (status, message) => Object.assign(new Error(message), { status });
