const router = require('express').Router();
const Note = require('../models/Note');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, parsePagination, pageMeta, validateId, isObjectId, httpError } = require('../utils/helpers');

router.param('id', validateId);
router.use(authenticate);

// GET /api/notes/all  (ADMIN) every note, optional ?owner=<userId>, paginated
// Declared before "/:id" so "all" is not treated as an id.
router.get('/all', authorize('admin'), asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.owner) {
    if (!isObjectId(req.query.owner)) throw httpError(400, 'Invalid owner id');
    filter.owner = req.query.owner;
  }
  const [data, total] = await Promise.all([
    Note.find(filter).sort({ _id: -1 }).skip(skip).limit(limit).populate('owner', 'name email'),
    Note.countDocuments(filter),
  ]);
  res.json({ data, pagination: pageMeta(total, page, limit) });
}));

// GET /api/notes  (my notes, paginated)  -> index { owner, _id:-1 }
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { owner: req.user._id };
  const [data, total] = await Promise.all([
    Note.find(filter).sort({ _id: -1 }).skip(skip).limit(limit),
    Note.countDocuments(filter),
  ]);
  res.json({ data, pagination: pageMeta(total, page, limit) });
}));

// POST /api/notes
router.post('/', asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  const note = await Note.create({ title, content, owner: req.user._id });
  res.status(201).json({ data: note });
}));

// GET /api/notes/:id  (owner or admin)  -> _id index
router.get('/:id', asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id).populate('owner', 'name email');
  if (!note) throw httpError(404, 'Note not found');
  const isOwner = String(note.owner._id) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw httpError(403, 'You do not have permission');
  res.json({ data: note });
}));

// PUT /api/notes/:id  (owner only)
router.put('/:id', asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw httpError(404, 'Note not found');
  if (String(note.owner) !== String(req.user._id)) throw httpError(403, 'You can only edit your own notes');
  if (req.body.title !== undefined) note.title = req.body.title;
  if (req.body.content !== undefined) note.content = req.body.content;
  await note.save();
  res.json({ data: note });
}));

// DELETE /api/notes/:id  (owner only)
router.delete('/:id', asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw httpError(404, 'Note not found');
  if (String(note.owner) !== String(req.user._id)) throw httpError(403, 'You can only delete your own notes');
  await note.deleteOne();
  res.json({ message: 'Note deleted' });
}));

module.exports = router;
