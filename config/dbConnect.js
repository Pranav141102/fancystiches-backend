const mongoose = require('mongoose');

const dbConnect = async () => {
  try {
    const dbURI = process.env.dbURI;

    if (!dbURI) {
      console.error('MongoDB connection string (dbURI) is not provided.');
      return;
    }

    console.log('Connecting to MongoDB:', dbURI);
    await mongoose.connect(dbURI); // Remove useNewUrlParser
    console.log('Database Connected');
  } catch (error) {
    console.error('Error connecting to the database:', error.message);
  }
};

module.exports = dbConnect;
