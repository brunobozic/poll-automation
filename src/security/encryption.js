const crypto = require('crypto');
require('dotenv').config();

class EncryptionManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    
    // Get encryption key from environment or generate one
    this.encryptionKey = this.getOrCreateKey();
  }

  // Get existing key or create new one
  getOrCreateKey() {
    let key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      // Generate new key
      key = crypto.randomBytes(this.keyLength).toString('hex');
      console.warn('⚠️  ENCRYPTION_KEY not found in .env file');
      console.warn('⚠️  Add this to your .env file:');
      console.warn(`ENCRYPTION_KEY=${key}`);
      console.warn('⚠️  Without this, credentials will be lost on restart!');
    }
    
    return Buffer.from(key, 'hex');
  }

  // Encrypt sensitive data
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine iv + tag + encrypted data
      const combined = iv.toString('hex') + tag.toString('hex') + encrypted;
      
      return combined;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt sensitive data
  decrypt(encryptedData) {
    try {
      // Extract components
      const iv = Buffer.from(encryptedData.substr(0, this.ivLength * 2), 'hex');
      const tag = Buffer.from(encryptedData.substr(this.ivLength * 2, this.tagLength * 2), 'hex');
      const encrypted = encryptedData.substr((this.ivLength + this.tagLength) * 2);
      
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - key might be incorrect');
    }
  }

  // Hash passwords for verification (one-way)
  hashPassword(password, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    
    return {
      hash,
      salt
    };
  }

  // Verify password against hash
  verifyPassword(password, hash, salt) {
    const newHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return newHash === hash;
  }

  // Generate secure random strings
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Create secure session ID
  generateSessionId() {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(16).toString('hex');
    return crypto.createHash('sha256').update(timestamp + random).digest('hex');
  }
}

module.exports = EncryptionManager;