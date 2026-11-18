const router = require('express').Router();
const User = require('../models/User');
const { authenticate, signToken } = require('../middleware/auth');
const { asyncHandler, httpError } = require('../utils/helpers');

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// POST /api/auth/register  (always creates a normal "user"; role can't be chosen here)
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, interests } = req.body;
  if (!name || !email || !password) throw httpError(400, 'name, email and password are required');
  if (!EMAIL_RE.test(email)) throw httpError(400, 'Invalid email');
  if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');

  const user = await User.create({ name, email, password, interests, role: 'user' });
  res.status(201).json({ token: signToken(user), user });
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw httpError(400, 'email and password are required');

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password'); // email index
  if (!user || !(await user.comparePassword(password))) throw httpError(401, 'Invalid email or password');

  res.json({ token: signToken(user), user });
}));

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => res.json({ data: req.user }));

// PUT /api/auth/me  (update own profile: name, interests)
router.put('/me', authenticate, asyncHandler(async (req, res) => {
  const { name, interests } = req.body;
  if (name !== undefined) req.user.name = name;
  if (interests !== undefined) req.user.interests = interests;
  await req.user.save();
  res.json({ data: req.user });
}));

module.exports = router;
