# Decentralized Voting System

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node.js](https://img.shields.io/badge/Node.js-16+-green)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-blue)
![IPFS](https://img.shields.io/badge/Storage-IPFS-lightgrey)
![Express](https://img.shields.io/badge/Backend-Express.js-orange)
![React](https://img.shields.io/badge/Frontend-React.js-blue)

A secure, transparent, and efficient voting platform leveraging **IPFS (InterPlanetary File System)** for immutable record-keeping and **MongoDB** for high-performance data management. This hybrid approach offers the security benefits of decentralization without the high costs and complexity of traditional blockchain solutions.

## 🚀 Why This is Better Than Blockchain?

While blockchain voting systems offer immutability, they often suffer from:
*   **High Costs**: Gas fees for every vote cast.
*   **Slow Speed**: Waiting for block confirmations (can take minutes).
*   **Complex UX**: Requirement for crypto wallets (Metamask, etc.) and managing private keys manually.

**This System Solves These Issues:**
1.  **Zero Gas Fees**: Voting is free for users. We use IPFS for storage, which is significantly cheaper and more scalable than storing data on-chain.
2.  **Instant Finality**: Votes are processed immediately via our high-performance backend, with permanent records anchored on IPFS.
3.  **Seamless User Experience**: Users log in with standard credentials. Complex cryptography (Encryption/Signing) happens transparently in the background. No wallet plugins required.
4.  **Verifiable & Immutable**: Every vote is stored on IPFS. The Content Identifier (CID) guarantees that the vote data cannot be altered without changing the ID, ensuring a tamper-proof audit trail.

## ✨ Key Features

*   **Hybrid Architecture**: Combines the speed of a centralized server with the security of decentralized storage.
*   **End-to-End Encryption**: Votes are encrypted using the Election Commission's public key. Only the tallying process can decrypt them.
*   **Anonymous Voting**: Voter identities are separated from their votes on IPFS to ensure ballot secrecy.
*   **Tamper-Proof Records**: All votes and registrations are uploaded to IPFS, creating an immutable history.
*   **Secure Authentication**: Uses Argon2 hashing and JWT for robust user security.
*   **Automated Tallying**: Admin-triggered tallying process that fetches data from IPFS, verifies signatures, and counts votes automatically.

## 🛠️ Tech Stack

*   **Frontend**: React.js, Vite, TailwindCSS
*   **Backend**: Node.js, Express.js
*   **Database**: MongoDB (User data, Election metadata)
*   **Decentralized Storage**: IPFS (via Pinata)
*   **Cryptography**: Bcrypt (Auth), Argon2 (Key Derivation), AES-GCM, RSA-OAEP, HMAC-SHA256

## 🏛️ Architecture: Centralized vs. Decentralized

This system employs a **Hybrid Architecture** to balance performance with trust.

### 🔴 Centralized Components (Performance & UX)
*   **User Authentication**: Traditional email/password login is handled by the central server. Passwords are hashed using **Bcrypt** for authentication.
*   **Key Management**: Sensitive keys (like private keys for signing) are encrypted with **AES-GCM** using a separate key derived from the user's password via **Argon2**. The server *never* sees the raw private keys.
*   **Election Management**: Admin tasks (creating elections, adding candidates) are managed centrally for efficiency.
*   **Database (MongoDB)**: Stores user profiles, election metadata, and the *links* (CIDs) to IPFS data. It acts as a high-speed index but does not store the raw vote data itself.

### 🟢 Decentralized Components (Trust & Immutability)
*   **Vote Storage (IPFS)**: The actual vote data (encrypted vote, signature) is stored on IPFS. Once uploaded, this data is immutable.
*   **Registration Records**: Voter registration proofs are also anchored on IPFS.
*   **Tallying Source**: The tallying process fetches data *directly* from IPFS, not the local database, ensuring that the count is based on the immutable record.

## 🕵️ Privacy & Anonymity

**"Not a single bit of detail is known about who cast which vote."**

We strictly separate **Identity** from **Voting Data**:

1.  **No Direct Link**: The database stores *who* voted (to prevent double voting) and *what* the vote CIDs are, but there is **no link** connecting a specific user ID to a specific vote CID.
2.  **Anonymous Payloads**: The data stored on IPFS contains the encrypted vote and a signature, but **no personal identifiable information (PII)**.
3.  **Mathematical Unlinkability**: Even if an attacker gains access to the database, they cannot map a user to their vote because the vote submission process is designed to be anonymous. The system verifies *eligibility* separately from *recording* the vote.

## ⚙️ Installation & Setup

### Prerequisites
*   Node.js (v16+)
*   MongoDB (Local or Atlas)
*   Pinata Account (for IPFS API keys)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Decentralized-Voting
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend` directory with the following variables:
```env
PORT=5000
Mongo_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY=https://gateway.pinata.cloud
IPFS_API=https://api.pinata.cloud/pinning/pinJSONToIPFS
HMAC_SECRET_KEY=your_hmac_secret
```

Start the server:
```bash
npm run server
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory and install dependencies:
```bash
cd ../Frontend
npm install
```

Create a `.env` file in the `Frontend` directory:
```env
VITE_BACKEND_URL='http://localhost:5000'
```

Start the development server:
```bash
npm run dev
```

## 📖 Usage Flow

1.  **Admin Setup**: Admin creates an election and generates Election Commission keys.
2.  **Voter Registration**: Users register and get approved. Their registration data is anchored to IPFS.
3.  **Voting**:
    *   User logs in and selects an active election.
    *   Vote is encrypted client-side/server-side.
    *   Encrypted vote is uploaded to IPFS.
    *   CID is stored in the database.
4.  **Tallying**:
    *   Election ends.
    *   Admin triggers the tally process.
    *   System fetches votes from IPFS, decrypts them using the private key, verifies signatures, and computes the result.

## 🚧 Roadmap & Future Improvements

While the current system is robust, there is always room for enhanced security:

*   **Vote Bundling (Mixnets)**: Currently, timing attacks (watching who sends a request and when a new IPFS CID appears) could theoretically de-anonymize voters. Future versions could implement **Vote Bundling**, where votes are collected in batches and shuffled before being uploaded to IPFS.
*   **Rate Limiting**: Implementing strict API rate limiting to prevent DDoS attacks.
*   **IPFS Access Logs**: Adding a public logging layer to monitor IPFS access patterns for auditing.
*   **Zero-Knowledge Proofs (ZKPs)**: Replacing the current signature scheme with ZKPs for even stronger anonymity guarantees.

## 🤝 Contributing
Contributions are welcome! Please fork the repository and submit a pull request.

## 🫂 Contributors

Special thanks to the team who worked on this project:

*   **Likhith**[[@Likhith025]](https://github.com/Likhith025)
*   **Kunal**[[@kunalchakilam]](https://github.com/kunalchakilam)
*   **Dachepally Sathwik**[[@Sathwik4804]](https://github.com/Sathwik4804)
*   **Gopishetty Sathwik**[[@Sathwik0806]](https://github.com/Sathwik0806)
*   **Lithin**[[@lithinkasaboina]](https://github.com/lithinkasaboina)

## 📄 License
[MIT](LICENSE)
