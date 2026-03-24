const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteLargeFiles = onObjectFinalized(async (event) => {
  const size = parseInt(event.data.size);
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (size > maxSize) {
    const bucket = admin.storage().bucket(event.data.bucket);
    const file = bucket.file(event.data.name);
    
    // Quebrei a linha abaixo para ficar curta:
    logger.warn(`Arquivo deletado: ${event.data.name} (${size} bytes)`);
    return file.delete();
  }
  return null;
});
