const router = require('express').Router();
const User = require('../models/User');
const Note = require('../models/Note');
const Post = require('../models/Post');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, parsePagination, pageMeta, validateId, toObjectId, httpError } = require('../utils/helpers');

router.param('id', validateId);

/* ------------------------------------------------------------------ *
 * Scenario 2 - posts of a particular user (PUBLIC)

 * ------------------------------------------------------------------ */
router.get('/:id/posts', asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [result] = await User.aggregate([
    { $match: { _id: toObjectId(req.params.id) } },
    {
      $lookup: {
        from: Post.collection.name,
        localField: '_id',
        foreignField: 'author',
        pipeline: [
          { $sort: { _id: -1 } },
          { $skip: skip },
          { $limit: limit + 1 }, // one extra row tells us if there is a next page
          { $project: { title: 1, body: 1, createdAt: 1, updatedAt: 1 } },
        ],
        as: 'posts',
      },
    },
    { $project: { name: 1, interests: 1, posts: 1 } },
  ]);

  if (!result) throw httpError(404, 'User not found');
  const hasMore = result.posts.length > limit;
  result.posts = result.posts.slice(0, limit);
  res.json({
    data: { user: { _id: result._id, name: result.name, interests: result.interests }, posts: result.posts },
    pagination: { page, limit, hasMore },
  });
}));

/* ------------------------------------------------------------------ *
 * Everything below is ADMIN only
 * ------------------------------------------------------------------ */
router.use(authenticate, authorize('admin'));

/* ------------------------------------------------------------------ *
 * Scenario 1 - users grouped by interests
 *
 * ------------------------------------------------------------------ */
router.get('/interests/grouped', asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const interest = req.query.interest ? String(req.query.interest).trim().toLowerCase() : null;

  const pipeline = [
    { $match: { interests: interest ? interest : { $type: 'string' } } },
    { $unwind: '$interests' },
    ...(interest ? [{ $match: { interests: interest } }] : []),
    {
      $group: {
        _id: '$interests',
        count: { $sum: 1 },
        users: { $push: { _id: '$_id', name: '$name', email: '$email' } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          { $project: { _id: 0, interest: '$_id', count: 1, users: 1 } },
        ],
        total: [{ $count: 'n' }],
      },
    },
  ];

  const [out] = await User.aggregate(pipeline);
  const total = out.total[0] ? out.total[0].n : 0;
  res.json({ data: out.data, pagination: pageMeta(total, page, limit) });
}));

// GET /api/users  (list, paginated, newest first) -> default _id index
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [data, total] = await Promise.all([
    User.find().sort({ _id: -1 }).skip(skip).limit(limit),
    User.estimatedDocumentCount(),
  ]);
  res.json({ data, pagination: pageMeta(total, page, limit) });
}));

// POST /api/users  (add user, optional role)
router.post('/', asyncHandler(async (req, res) => {
  const { name, email, password, role, interests } = req.body;
  if (!name || !email || !password) throw httpError(400, 'name, email and password are required');
  const user = await User.create({ name, email, password, role, interests });
  res.status(201).json({ data: user });
}));

// GET /api/users/:id -> _id index
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  res.json({ data: user });
}));

// PUT /api/users/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');

  const { name, email, role, interests, password } = req.body;
  if (role && String(user._id) === String(req.user._id) && role !== user.role) {
    throw httpError(400, 'You cannot change your own role');
  }
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;
  if (interests !== undefined) user.interests = interests;
  if (password) user.password = password; // hashed by pre-save hook
  await user.save();
  res.json({ data: user });
}));

// DELETE /api/users/:id  (also removes the user's notes and posts)
router.delete('/:id', asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw httpError(400, 'You cannot delete yourself');
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  await Promise.all([
    Note.deleteMany({ owner: user._id }), // uses { owner, _id } index
    Post.deleteMany({ author: user._id }), // uses { author, _id } index
    user.deleteOne(),
  ]);
  res.json({ message: 'User and related data deleted' });
}));

module.exports = router;
