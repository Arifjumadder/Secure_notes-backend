const router = require('express').Router();
const Post = require('../models/Post');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, parsePagination, pageMeta, validateId, httpError } = require('../utils/helpers');

router.param('id', validateId);

// ---- Public (posts are visible to everyone) ----

// GET /api/posts  (public feed, newest first, paginated) -> _id index
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [data, total] = await Promise.all([
    Post.find().sort({ _id: -1 }).skip(skip).limit(limit).populate('author', 'name'),
    Post.estimatedDocumentCount(),
  ]);
  res.json({ data, pagination: pageMeta(total, page, limit) });
}));

// GET /api/posts/:id -> _id index
router.get('/:id', asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).populate('author', 'name');
  if (!post) throw httpError(404, 'Post not found');
  res.json({ data: post });
}));

// ---- Authenticated ----
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { title, body } = req.body;
  const post = await Post.create({ title, body, author: req.user._id });
  res.status(201).json({ data: post });
}));

router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw httpError(404, 'Post not found');
  if (String(post.author) !== String(req.user._id)) throw httpError(403, 'You can only edit your own posts');
  if (req.body.title !== undefined) post.title = req.body.title;
  if (req.body.body !== undefined) post.body = req.body.body;
  await post.save();
  res.json({ data: post });
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw httpError(404, 'Post not found');
  const isOwner = String(post.author) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw httpError(403, 'You do not have permission');
  await post.deleteOne();
  res.json({ message: 'Post deleted' });
}));

module.exports = router;
