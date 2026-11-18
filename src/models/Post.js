const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 5000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

/*
 * { author: 1, _id: -1 }
 *  -> foreignField of the $lookup in "posts of a user" (equality on author,
 *     sorted newest first inside the lookup pipeline).
 * Public feed (all posts, newest first) and GET /posts/:id use the default _id index.
 */
postSchema.index({ author: 1, _id: -1 });

module.exports = mongoose.model('Post', postSchema);
