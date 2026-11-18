const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, default: '', maxlength: 5000 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

/*
 * { owner: 1, _id: -1 }
 *  -> "my notes" list (filter by owner, newest first, paginated) and the admin
 *     "notes of user X" filter. Equality on owner + sort on _id = no in-memory sort.
 * Admin "all notes" list (no filter, newest first) walks the default _id index.
 * GET /notes/:id uses the default _id index.
 */
noteSchema.index({ owner: 1, _id: -1 });

module.exports = mongoose.model('Note', noteSchema);
