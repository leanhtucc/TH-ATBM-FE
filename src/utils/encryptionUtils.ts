/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
/**
 * Encryption utilities for client-side password encryption
 */

/**
 * Encrypts a password string using a passphrase
 * @param password - The password to encrypt
 * @param passphrase - The user's master passphrase
 * @returns An object containing encrypted data and initialization vector
 */
export const encryptPassword = async (password: string, passphrase: string): Promise<{ encryptedData: string; iv: string }> => {
  try {
    // Generate a random IV (Initialization Vector)
    const ivArray = new Uint8Array(16);
    window.crypto.getRandomValues(ivArray);
    
    // Convert IV to hex string for storage and transmission
    const iv = Array.from(ivArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Derive encryption key from user's passphrase
    const encoder = new TextEncoder();
    const passphraseData = encoder.encode(passphrase);
    
    // Use SHA-256 to create a key from the passphrase
    const passphraseHash = await window.crypto.subtle.digest('SHA-256', passphraseData);
    
    // Import the hashed passphrase as an AES-CBC key
    const key = await window.crypto.subtle.importKey(
      'raw',
      passphraseHash,
      { name: 'AES-CBC' },
      false,
      ['encrypt']
    );
    
    // Encrypt the password data
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-CBC',
        iv: ivArray
      },
      key,
      encoder.encode(password)
    );
    
    // Convert the encrypted data to base64
    const encryptedData = btoa(
      String.fromCharCode(...new Uint8Array(encryptedBuffer))
    );
    
    return { encryptedData, iv };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt password');
  }
};

/**
 * Decrypts an encrypted password string using the user's passphrase
 * @param encryptedData - The encrypted password data in base64 format
 * @param iv - The initialization vector used for encryption in hex format
 * @param passphrase - The user's master passphrase
 * @returns The decrypted password as a string
 */
export const decryptPassword = async (encryptedData: string, iv: string, passphrase: string): Promise<string> => {
  try {
    // Convert IV from hex string back to Uint8Array
    const ivArray = new Uint8Array(iv.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    // Convert encrypted data from base64 to array buffer
    const encryptedBytes = atob(encryptedData);
    const encryptedBuffer = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      encryptedBuffer[i] = encryptedBytes.charCodeAt(i);
    }
    
    // Generate the key using the same passphrase used during encryption
    const encoder = new TextEncoder();
    const passphraseData = encoder.encode(passphrase);
    const passphraseHash = await window.crypto.subtle.digest('SHA-256', passphraseData);
    
    // Import the key
    const key = await window.crypto.subtle.importKey(
      'raw',
      passphraseHash,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-CBC',
        iv: ivArray
      },
      key,
      encryptedBuffer
    );
    
    // Convert the decrypted data to string
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt password. Please check your passphrase.');
  }
};

// For backward compatibility
export const simulateDecryptPassword = async (encryptedData: string, iv: string): Promise<string> => {
  try {
    // This is a temporary function that should redirect to the proper authentication flow
    // In a real implementation, this should never decrypt without authentication
    throw new Error('Authentication required to view password');
  } catch (error) {
    console.error('Decryption error:', error);
    return "Authentication required to view this password";
  }
};