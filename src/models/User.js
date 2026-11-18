const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const normalizeInterests = (arr) => [
  ...new Set((arr || []).map((s) => String(s).trim().toLowerCase()).filter(Boolean)),
];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    interests: { type: [String], default: [], set: normalizeInterests },
  },
  { timestamps: true }
);

/*
 * INDEXES (only what the queries need)
 *  1. { email: 1 } unique  -> login lookup, duplicate-email protection.
 *  2. { interests: 1 }     -> multikey index used by the "group by interests" aggregation
 *                             ($match on interests before $unwind / $group).
 *  Everything else on users is covered by the default _id index:
 *   - GET user by id / profile (/me)           -> _id
 *   - Admin user list (sort newest first)      -> sorted by _id (ObjectId is time ordered)
 *   - Posts-of-user aggregation ($match _id)   -> _id
 */
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ interests: 1 });

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
