// Script to drop old unique indexes and create new compound indexes
// Run this in MongoDB shell or via Node.js

db.ipfsregistrations.dropIndex("tokenHash_1");
db.ipfsregistrations.dropIndex("publicKeyHash_1");

// The new compound indexes will be created automatically when the server restarts
// Or you can create them manually:
db.ipfsregistrations.createIndex({ tokenHash: 1, election: 1 }, { unique: true });
db.ipfsregistrations.createIndex({ publicKeyHash: 1, election: 1 }, { unique: true });

console.log("✅ Old indexes dropped and new compound indexes created!");
