const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, httpError } = require('../utils/helpers');

exports.signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw httpError(401, 'Authentication required');

  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(payload.id); // _id index; role changes/deletes apply instantly
  if (!user) throw httpError(401, 'User no longer exists');
  req.user = user;
  next();
});

exports.authorize = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(httpError(403, 'You do not have permission'));
