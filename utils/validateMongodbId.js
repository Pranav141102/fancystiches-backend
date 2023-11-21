// validateMongodbId.js
const mongoose = require('mongoose');

const validateMongoDbId = (id) => {
  if (!ObjectId.isValid(id)) {
    throw new Error('This id is not valid or not Found');
  }
};


module.exports = validateMongoDbId;
