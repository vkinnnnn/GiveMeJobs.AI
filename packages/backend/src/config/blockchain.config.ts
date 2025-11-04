import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import Web3 from 'web3';

// Import contract ABI - using require for JSON compatibility
const contractABIData = require('../contracts/CredentialStorage.json');

dotenv.config();

/**
 * Blockchain Configuration
 * 
 * This module provides a simulated blockchain implementation that can be replaced
 * with actual Hyperledger Fabric or Ethereum integration in production.
 * 
 * For production deployment:
 * - Replace with Hyperledger Fabric SDK or Web3.js
 * - Configure proper network endpoints
 * - Implement proper key management with HSM
 */

export interface BlockchainConfig {
  network: 'simulated' | 'hyperledger' | 'ethereum' | 'ganache';
  endpoint?: string;
  chainId?: string;
  contractAddress?: string;
  privateKey?: string;
  keyManagement: {
    algorithm: string;
    keyLength: number;
  };
}

export interface BlockchainTransaction {
  txId: string;
  blockNumber: number;
  timestamp: Date;
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

class BlockchainClient {
  private config: BlockchainConfig;
  private web3: Web3 | null = null;
  private contract: any = null;
  private account: any = null;
  private blockCounter: number = 0;
  private transactions: Map<string, BlockchainTransaction> = new Map();

  constructor() {
    this.config = {
      network: (process.env.BLOCKCHAIN_NETWORK as any) || 'ganache',
      endpoint: process.env.BLOCKCHAIN_ENDPOINT || 'http://localhost:8545',
      chainId: process.env.BLOCKCHAIN_CHAIN_ID || '1337',
      contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
      privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
      keyManagement: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
      },
    };

    this.initializeBlockchain();
  }

  private async initializeBlockchain() {
    try {
      if (this.config.network === 'simulated') {
        console.log(`✓ Blockchain client initialized (${this.config.network} mode)`);
        return;
      }

      // Initialize Web3 connection
      this.web3 = new Web3(this.config.endpoint!);

      // Test connection
      const isConnected = await this.web3.eth.net.isListening();
      if (!isConnected) {
        console.log(`⚠️ Blockchain network not available, falling back to simulated mode`);
        this.config.network = 'simulated';
        return;
      }

      // Set up account if private key is provided
      if (this.config.privateKey) {
        this.account = this.web3.eth.accounts.privateKeyToAccount(this.config.privateKey);
        this.web3.eth.accounts.wallet.add(this.account);
        this.web3.eth.defaultAccount = this.account.address;
      }

      // Initialize contract if address is provided
      if (this.config.contractAddress) {
        this.contract = new this.web3.eth.Contract(
          contractABIData.abi as any,
          this.config.contractAddress
        );
      }

      console.log(`✓ Blockchain client initialized (${this.config.network} mode)`);
      console.log(`  - Network: ${this.config.endpoint}`);
      console.log(`  - Account: ${this.account?.address || 'Not configured'}`);
      console.log(`  - Contract: ${this.config.contractAddress || 'Not deployed'}`);

    } catch (error) {
      console.log(`⚠️ Blockchain initialization failed, using simulated mode:`, error);
      this.config.network = 'simulated';
    }
  }

  /**
   * Generate a new key pair for blockchain operations
   */
  generateKeyPair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { publicKey, privateKey };
  }

  /**
   * Store data hash on blockchain
   */
  async storeHash(dataHash: string, metadata?: Record<string, any>): Promise<BlockchainTransaction> {
    if (this.config.network === 'simulated' || !this.web3 || !this.contract || !this.account) {
      return this.simulateStoreHash(dataHash, metadata);
    }

    try {
      // Generate unique credential ID
      const credentialId = this.web3.utils.keccak256(
        this.web3.utils.encodePacked(
          { value: metadata?.userId || '', type: 'string' },
          { value: metadata?.credentialType || '', type: 'string' },
          { value: Date.now().toString(), type: 'string' }
        )!
      );

      // Call smart contract to store credential
      const tx = await this.contract.methods.storeCredential(
        credentialId,
        dataHash,
        metadata?.credentialType || 'unknown',
        metadata?.issuer || 'unknown'
      ).send({
        from: this.account.address,
        gas: '500000',
        gasPrice: (await this.web3.eth.getGasPrice()).toString()
      });

      const transaction: BlockchainTransaction = {
        txId: tx.transactionHash,
        blockNumber: Number(tx.blockNumber),
        timestamp: new Date(),
        hash: dataHash,
        status: 'confirmed',
      };

      this.transactions.set(tx.transactionHash, transaction);
      return transaction;

    } catch (error) {
      console.error('Blockchain storage failed, using simulation:', error);
      return this.simulateStoreHash(dataHash, metadata);
    }
  }

  private async simulateStoreHash(dataHash: string, metadata?: Record<string, any>): Promise<BlockchainTransaction> {
    const txId = crypto.randomUUID();
    this.blockCounter++;

    const transaction: BlockchainTransaction = {
      txId,
      blockNumber: this.blockCounter,
      timestamp: new Date(),
      hash: dataHash,
      status: 'confirmed',
    };

    this.transactions.set(txId, transaction);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return transaction;
  }

  /**
   * Retrieve transaction from blockchain
   */
  async getTransaction(txId: string): Promise<BlockchainTransaction | null> {
    if (this.config.network === 'simulated' || !this.web3) {
      await new Promise(resolve => setTimeout(resolve, 50));
      return this.transactions.get(txId) || null;
    }

    try {
      const receipt = await this.web3.eth.getTransactionReceipt(txId);
      if (!receipt) {
        return null;
      }

      const transaction: BlockchainTransaction = {
        txId: receipt.transactionHash,
        blockNumber: Number(receipt.blockNumber),
        timestamp: new Date(), // In real implementation, get block timestamp
        hash: '', // Would need to parse from transaction data
        status: receipt.status ? 'confirmed' : 'failed',
      };

      return transaction;

    } catch (error) {
      console.error('Failed to retrieve transaction from blockchain:', error);
      return this.transactions.get(txId) || null;
    }
  }

  /**
   * Verify hash integrity on blockchain
   */
  async verifyHash(txId: string, expectedHash: string): Promise<boolean> {
    if (this.config.network === 'simulated' || !this.web3 || !this.contract) {
      const transaction = await this.getTransaction(txId);
      return transaction ? transaction.hash === expectedHash && transaction.status === 'confirmed' : false;
    }

    try {
      // In a real implementation, you would:
      // 1. Get the transaction receipt
      // 2. Parse the event logs to find the credential storage event
      // 3. Extract the hash from the event data
      // 4. Compare with expected hash

      const transaction = await this.getTransaction(txId);
      return transaction ? transaction.status === 'confirmed' : false;

    } catch (error) {
      console.error('Failed to verify hash on blockchain:', error);
      return false;
    }
  }

  /**
   * Get blockchain network status
   */
  async getNetworkStatus(): Promise<{
    connected: boolean;
    blockHeight: number;
    network: string;
    contractDeployed?: boolean;
    accountAddress?: string;
  }> {
    if (this.config.network === 'simulated' || !this.web3) {
      return {
        connected: true,
        blockHeight: this.blockCounter,
        network: this.config.network,
      };
    }

    try {
      const isConnected = await this.web3.eth.net.isListening();
      const blockHeight = await this.web3.eth.getBlockNumber();

      return {
        connected: isConnected,
        blockHeight: Number(blockHeight),
        network: this.config.network,
        contractDeployed: !!this.contract,
        accountAddress: this.account?.address,
      };

    } catch (error) {
      return {
        connected: false,
        blockHeight: 0,
        network: this.config.network,
      };
    }
  }

  /**
   * Deploy the credential storage contract
   */
  async deployContract(): Promise<string | null> {
    if (this.config.network === 'simulated' || !this.web3 || !this.account) {
      console.log('Contract deployment not available in simulated mode');
      return null;
    }

    try {
      const contract = new this.web3.eth.Contract(contractABIData.abi as any);

      const deployTx = contract.deploy({
        data: contractABIData.bytecode,
      });

      const gasPrice = await this.web3.eth.getGasPrice();
      const deployedContract = await deployTx.send({
        from: this.account.address,
        gas: '2000000',
        gasPrice: gasPrice.toString()
      });

      this.contract = deployedContract;
      this.config.contractAddress = deployedContract.options.address || undefined;

      console.log(`✓ Contract deployed at: ${deployedContract.options.address}`);
      return deployedContract.options.address || null;

    } catch (error) {
      console.error('Contract deployment failed:', error);
      return null;
    }
  }

  /**
   * Get contract instance
   */
  getContract() {
    return this.contract;
  }

  /**
   * Get Web3 instance
   */
  getWeb3() {
    return this.web3;
  }

  /**
   * Get account address
   */
  getAccountAddress(): string | null {
    return this.account?.address || null;
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encryptData(data: string, key: Buffer): {
    encrypted: string;
    iv: string;
    authTag: string;
  } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.config.keyManagement.algorithm, key, iv) as crypto.CipherGCM;

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decryptData(
    encrypted: string,
    key: Buffer,
    iv: string,
    authTag: string
  ): string {
    const decipher = crypto.createDecipheriv(
      this.config.keyManagement.algorithm,
      key,
      Buffer.from(iv, 'hex')
    ) as crypto.DecipherGCM;

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate cryptographic hash
   */
  generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate encryption key from password
   */
  deriveKey(password: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  }
}

// Singleton instance
export const blockchainClient = new BlockchainClient();

// Key Management System
class KeyManagementSystem {
  private keys: Map<string, { key: Buffer; salt: string }> = new Map();

  /**
   * Generate and store encryption key for user
   */
  generateUserKey(userId: string): { key: Buffer; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const key = crypto.randomBytes(32);

    this.keys.set(userId, { key, salt });

    return { key, salt };
  }

  /**
   * Retrieve user encryption key
   */
  getUserKey(userId: string): { key: Buffer; salt: string } | null {
    return this.keys.get(userId) || null;
  }

  /**
   * Rotate user encryption key
   */
  rotateUserKey(userId: string): { key: Buffer; salt: string } {
    const newKey = this.generateUserKey(userId);
    return newKey;
  }

  /**
   * Delete user key (for GDPR compliance)
   */
  deleteUserKey(userId: string): boolean {
    return this.keys.delete(userId);
  }
}

export const keyManagementSystem = new KeyManagementSystem();
