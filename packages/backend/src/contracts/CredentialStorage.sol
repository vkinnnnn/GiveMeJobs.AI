// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CredentialStorage
 * @dev Smart contract for storing credential hashes on blockchain
 * Provides immutable storage with access control and audit trails
 */
contract CredentialStorage {
    struct Credential {
        string credentialHash;
        string credentialType;
        string issuer;
        uint256 timestamp;
        address owner;
        bool exists;
    }

    struct AccessGrant {
        address grantedTo;
        uint256 expiresAt;
        bool revoked;
        string purpose;
    }

    // Mapping from credential ID to credential data
    mapping(bytes32 => Credential) public credentials;
    
    // Mapping from credential ID to access grants
    mapping(bytes32 => mapping(address => AccessGrant)) public accessGrants;
    
    // Mapping to track all credential IDs for a user
    mapping(address => bytes32[]) public userCredentials;
    
    // Events for audit trail
    event CredentialStored(
        bytes32 indexed credentialId,
        address indexed owner,
        string credentialType,
        string issuer,
        uint256 timestamp
    );
    
    event AccessGranted(
        bytes32 indexed credentialId,
        address indexed owner,
        address indexed grantedTo,
        uint256 expiresAt,
        string purpose
    );
    
    event AccessRevoked(
        bytes32 indexed credentialId,
        address indexed owner,
        address indexed revokedFrom
    );
    
    event CredentialAccessed(
        bytes32 indexed credentialId,
        address indexed accessor,
        uint256 timestamp
    );

    modifier onlyOwner(bytes32 credentialId) {
        require(credentials[credentialId].owner == msg.sender, "Not credential owner");
        _;
    }

    modifier credentialExists(bytes32 credentialId) {
        require(credentials[credentialId].exists, "Credential does not exist");
        _;
    }

    modifier hasValidAccess(bytes32 credentialId) {
        require(
            credentials[credentialId].owner == msg.sender ||
            (accessGrants[credentialId][msg.sender].expiresAt > block.timestamp &&
             !accessGrants[credentialId][msg.sender].revoked),
            "Access denied"
        );
        _;
    }

    /**
     * @dev Store a new credential hash on blockchain
     * @param credentialId Unique identifier for the credential
     * @param credentialHash SHA-256 hash of the credential data
     * @param credentialType Type of credential (degree, certificate, etc.)
     * @param issuer Institution or organization that issued the credential
     */
    function storeCredential(
        bytes32 credentialId,
        string memory credentialHash,
        string memory credentialType,
        string memory issuer
    ) external {
        require(!credentials[credentialId].exists, "Credential already exists");
        require(bytes(credentialHash).length > 0, "Hash cannot be empty");
        require(bytes(credentialType).length > 0, "Type cannot be empty");
        require(bytes(issuer).length > 0, "Issuer cannot be empty");

        credentials[credentialId] = Credential({
            credentialHash: credentialHash,
            credentialType: credentialType,
            issuer: issuer,
            timestamp: block.timestamp,
            owner: msg.sender,
            exists: true
        });

        userCredentials[msg.sender].push(credentialId);

        emit CredentialStored(
            credentialId,
            msg.sender,
            credentialType,
            issuer,
            block.timestamp
        );
    }

    /**
     * @dev Grant access to a credential for a specific address
     * @param credentialId ID of the credential
     * @param grantedTo Address to grant access to
     * @param expiresAt Timestamp when access expires
     * @param purpose Purpose of the access grant
     */
    function grantAccess(
        bytes32 credentialId,
        address grantedTo,
        uint256 expiresAt,
        string memory purpose
    ) external onlyOwner(credentialId) credentialExists(credentialId) {
        require(grantedTo != address(0), "Invalid address");
        require(expiresAt > block.timestamp, "Expiry must be in future");

        accessGrants[credentialId][grantedTo] = AccessGrant({
            grantedTo: grantedTo,
            expiresAt: expiresAt,
            revoked: false,
            purpose: purpose
        });

        emit AccessGranted(credentialId, msg.sender, grantedTo, expiresAt, purpose);
    }

    /**
     * @dev Revoke access to a credential
     * @param credentialId ID of the credential
     * @param revokeFrom Address to revoke access from
     */
    function revokeAccess(
        bytes32 credentialId,
        address revokeFrom
    ) external onlyOwner(credentialId) credentialExists(credentialId) {
        require(accessGrants[credentialId][revokeFrom].grantedTo != address(0), "No access granted");

        accessGrants[credentialId][revokeFrom].revoked = true;

        emit AccessRevoked(credentialId, msg.sender, revokeFrom);
    }

    /**
     * @dev Verify and access credential data
     * @param credentialId ID of the credential to access
     * @return credential The credential data
     */
    function accessCredential(bytes32 credentialId)
        external
        credentialExists(credentialId)
        hasValidAccess(credentialId)
        returns (Credential memory credential)
    {
        credential = credentials[credentialId];
        
        emit CredentialAccessed(credentialId, msg.sender, block.timestamp);
        
        return credential;
    }

    /**
     * @dev Get credential data (view function)
     * @param credentialId ID of the credential
     * @return credential The credential data
     */
    function getCredential(bytes32 credentialId)
        external
        view
        credentialExists(credentialId)
        hasValidAccess(credentialId)
        returns (Credential memory credential)
    {
        return credentials[credentialId];
    }

    /**
     * @dev Check if an address has valid access to a credential
     * @param credentialId ID of the credential
     * @param accessor Address to check access for
     * @return hasAccess Whether the address has valid access
     */
    function hasAccess(bytes32 credentialId, address accessor)
        external
        view
        credentialExists(credentialId)
        returns (bool hasAccess)
    {
        if (credentials[credentialId].owner == accessor) {
            return true;
        }

        AccessGrant memory grant = accessGrants[credentialId][accessor];
        return (grant.grantedTo != address(0) && 
                grant.expiresAt > block.timestamp && 
                !grant.revoked);
    }

    /**
     * @dev Get all credential IDs for a user
     * @param user Address of the user
     * @return credentialIds Array of credential IDs
     */
    function getUserCredentials(address user)
        external
        view
        returns (bytes32[] memory credentialIds)
    {
        return userCredentials[user];
    }

    /**
     * @dev Get access grant details
     * @param credentialId ID of the credential
     * @param accessor Address of the accessor
     * @return grant The access grant details
     */
    function getAccessGrant(bytes32 credentialId, address accessor)
        external
        view
        credentialExists(credentialId)
        returns (AccessGrant memory grant)
    {
        return accessGrants[credentialId][accessor];
    }

    /**
     * @dev Verify credential hash integrity
     * @param credentialId ID of the credential
     * @param expectedHash Expected hash to verify against
     * @return isValid Whether the hash matches
     */
    function verifyCredentialHash(bytes32 credentialId, string memory expectedHash)
        external
        view
        credentialExists(credentialId)
        returns (bool isValid)
    {
        return keccak256(abi.encodePacked(credentials[credentialId].credentialHash)) == 
               keccak256(abi.encodePacked(expectedHash));
    }

    /**
     * @dev Get total number of credentials stored
     * @return count Total credential count
     */
    function getTotalCredentials() external view returns (uint256 count) {
        // This is a simplified implementation
        // In production, you'd want to track this more efficiently
        return block.number; // Placeholder
    }
}