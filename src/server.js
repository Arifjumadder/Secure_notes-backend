require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const seedAdmin = require('./utils/seedAdmin');
const User = require('./models/User');
const Note = require('./models/Note');
const Post = require('./models/Post');

const PORT = process.env.PORT || 5000;

(async () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  await connectDB();
  await Promise.all([User.init(), Note.init(), Post.init()]); // make sure schema.index() indexes exist
  await seedAdmin();
  app.listen(PORT, () => console.log(`API running on port ${PORT}`));
})().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
