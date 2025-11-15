/**
 * Candidate ID Converter Utility
 * Converts between string IDs (e.g., "C001") and numeric IDs (e.g., 1)
 * Allows numeric calculations on candidate IDs without losing the original format
 */

/**
 * Extract prefix and numeric portion from candidate ID string
 * @param {string} candidateIdString - e.g., "C001"
 * @returns {object} - { prefix: "C", number: 1, paddingLength: 3 }
 */
export const parseCandidateIdString = (candidateIdString) => {
    try {
        if (typeof candidateIdString !== 'string' || candidateIdString.length === 0) {
            throw new Error('Candidate ID must be a non-empty string');
        }

        // Extract prefix (letters) and numeric part (digits)
        const match = candidateIdString.match(/^([A-Za-z]*)(\d+)$/);
        if (!match) {
            throw new Error(`Invalid candidate ID format: "${candidateIdString}". Expected format like "C001" or "Candidate123"`);
        }

        const prefix = match[1];
        const numericString = match[2];
        const paddingLength = numericString.length;
        const number = parseInt(numericString, 10);

        return {
            prefix,
            number,
            paddingLength
        };
    } catch (error) {
        throw new Error(`parseCandidateIdString Error: ${error.message}`);
    }
};

/**
 * Convert candidate ID string to numeric ID
 * @param {string} candidateIdString - e.g., "C001"
 * @returns {number} - e.g., 1
 */
export const stringIdToNumber = (candidateIdString) => {
    try {
        const { number } = parseCandidateIdString(candidateIdString);
        return number;
    } catch (error) {
        throw new Error(`stringIdToNumber Error: ${error.message}`);
    }
};

/**
 * Convert numeric ID back to candidate ID string using original format metadata
 * @param {number} numericId - e.g., 1
 * @param {object} formatMetadata - { prefix: "C", paddingLength: 3 }
 * @returns {string} - e.g., "C001"
 */
export const numberToStringId = (numericId, formatMetadata) => {
    try {
        if (!Number.isInteger(numericId) || numericId <= 0) {
            throw new Error('Numeric ID must be a positive integer');
        }

        const { prefix, paddingLength } = formatMetadata;

        if (typeof prefix !== 'string') {
            throw new Error('Prefix must be a string');
        }

        if (!Number.isInteger(paddingLength) || paddingLength < 1) {
            throw new Error('Padding length must be a positive integer');
        }

        // Pad the number with zeros to match original length
        const paddedNumber = String(numericId).padStart(paddingLength, '0');
        return `${prefix}${paddedNumber}`;
    } catch (error) {
        throw new Error(`numberToStringId Error: ${error.message}`);
    }
};

/**
 * Convenience function to convert string ID, perform operation, and convert back
 * @param {string} candidateIdString - e.g., "C001"
 * @param {function} operation - Function that takes numeric ID and returns modified numeric ID
 * @returns {object} - { originalString: "C001", numericId: 1, resultNumeric: <result>, resultString: <result> }
 */
export const convertCalculateConvertBack = (candidateIdString, operation) => {
    try {
        if (typeof operation !== 'function') {
            throw new Error('Operation must be a function');
        }

        // Step 1: Parse and convert string to number
        const formatMetadata = parseCandidateIdString(candidateIdString);
        const numericId = formatMetadata.number;

        // Step 2: Perform calculation on numeric ID
        const resultNumeric = operation(numericId);

        // Step 3: Convert back to string
        const resultString = numberToStringId(resultNumeric, formatMetadata);

        return {
            originalString: candidateIdString,
            numericId,
            resultNumeric,
            resultString
        };
    } catch (error) {
        throw new Error(`convertCalculateConvertBack Error: ${error.message}`);
    }
};

/**
 * Example usage in voting system
 * Instead of storing format metadata, use this pattern:
 * 
 * 1. Convert on input: const numericId = stringIdToNumber("C001");
 * 2. Store format: const format = parseCandidateIdString("C001");
 * 3. Use numeric for all calculations (XOR, hashing, etc.)
 * 4. Convert back on output: const originalId = numberToStringId(numericId, format);
 */
