#!/usr/bin/env tsx

/**
 * Blockchain Setup Script
 * 
 * This script sets up a local blockchain environment for development:
 * 1. Starts Ganache CLI (if not running)
 * 2. Deploys the CredentialStorage smart contract
 * 3. Updates environment variables with contract address
 * 4. Tests basic blockchain functionality
 */

import { blockchainClient } from '../config/blockchain.config';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function setupBlockchain() {
  console.log('🔗 Setting up blockchain environment...\n');

  try {
    // Check if Ganache is available
    const status = await blockchainClient.getNetworkStatus();
    
    if (!status.connected) {
      console.log('❌ Blockchain network not connected');
      console.log('📋 To set up a local blockchain:');
      console.log('   1. Install Ganache CLI: npm install -g ganache-cli');
      console.log('   2. Start Ganache: ganache-cli --deterministic --accounts 10 --host 0.0.0.0');
      console.log('   3. Or use Ganache GUI: https://trufflesuite.com/ganache/');
      console.log('   4. Update BLOCKCHAIN_ENDPOINT in .env file');
      console.log('   5. Run this script again\n');
      
      // Try to start Ganache automatically
      console.log('🚀 Attempting to start Ganache CLI...');
      await startGanache();
      return;
    }

    console.log('✅ Connected to blockchain network');
    console.log(`   - Network: ${status.network}`);
    console.log(`   - Block Height: ${status.blockHeight}`);
    console.log(`   - Account: ${status.accountAddress || 'Not configured'}`);

    // Deploy contract if not already deployed
    if (!status.contractDeployed) {
      console.log('\n📄 Deploying CredentialStorage contract...');
      const contractAddress = await blockchainClient.deployContract();
      
      if (contractAddress) {
        console.log(`✅ Contract deployed successfully!`);
        console.log(`   - Address: ${contractAddress}`);
        
        // Update .env file with contract address
        await updateEnvFile(contractAddress);
        
      } else {
        console.log('❌ Contract deployment failed');
        console.log('   - Check that you have sufficient ETH in your account');
        console.log('   - Verify the private key is correct');
        console.log('   - Ensure the network is accessible');
      }
    } else {
      console.log('✅ Contract already deployed');
    }

    // Test basic functionality
    console.log('\n🧪 Testing blockchain functionality...');
    await testBlockchainFunctions();

    console.log('\n🎉 Blockchain setup complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. The blockchain service is ready to use');
    console.log('   2. You can now store and verify credentials');
    console.log('   3. Check the API endpoints: /api/blockchain/*');

  } catch (error) {
    console.error('❌ Blockchain setup failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure Ganache is running on http://localhost:8545');
    console.log('   2. Check that BLOCKCHAIN_PRIVATE_KEY is set in .env');
    console.log('   3. Verify the private key has sufficient ETH');
    console.log('   4. Try restarting Ganache and running this script again');
  }
}

async function startGanache(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Starting Ganache CLI...');
    
    const ganache = spawn('ganache-cli', [
      '--deterministic',
      '--accounts', '10',
      '--host', '0.0.0.0',
      '--port', '8545',
      '--networkId', '1337'
    ], {
      stdio: 'pipe'
    });

    let started = false;

    ganache.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      
      if (output.includes('Listening on') && !started) {
        started = true;
        console.log('✅ Ganache started successfully!');
        
        // Extract the first private key for configuration
        const privateKeyMatch = output.match(/\(0\) (0x[a-fA-F0-9]{64})/);
        if (privateKeyMatch) {
          const privateKey = privateKeyMatch[1];
          console.log(`🔑 Default private key: ${privateKey}`);
          console.log('   Add this to your .env file as BLOCKCHAIN_PRIVATE_KEY');
        }
        
        setTimeout(() => resolve(), 2000); // Give it time to fully start
      }
    });

    ganache.stderr.on('data', (data) => {
      console.error('Ganache error:', data.toString());
    });

    ganache.on('error', (error) => {
      if (error.message.includes('ENOENT')) {
        console.log('❌ Ganache CLI not found. Please install it:');
        console.log('   npm install -g ganache-cli');
      } else {
        console.error('Failed to start Ganache:', error);
      }
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!started) {
        ganache.kill();
        reject(new Error('Ganache startup timeout'));
      }
    }, 30000);
  });
}

async function updateEnvFile(contractAddress: string): Promise<void> {
  const envPath = path.join(process.cwd(), '.env');
  
  try {
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Update or add contract address
    if (envContent.includes('BLOCKCHAIN_CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(
        /BLOCKCHAIN_CONTRACT_ADDRESS=.*/,
        `BLOCKCHAIN_CONTRACT_ADDRESS=${contractAddress}`
      );
    } else {
      envContent += `\nBLOCKCHAIN_CONTRACT_ADDRESS=${contractAddress}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env file with contract address');
    
  } catch (error) {
    console.error('Failed to update .env file:', error);
    console.log(`Please manually add: BLOCKCHAIN_CONTRACT_ADDRESS=${contractAddress}`);
  }
}

async function testBlockchainFunctions(): Promise<void> {
  try {
    // Test hash generation
    const testData = 'test credential data';
    const hash = blockchainClient.generateHash(testData);
    console.log(`✅ Hash generation: ${hash.substring(0, 16)}...`);

    // Test encryption/decryption
    const key = Buffer.from('test-key-32-bytes-long-for-aes256', 'utf8');
    const encrypted = blockchainClient.encryptData(testData, key);
    const decrypted = blockchainClient.decryptData(
      encrypted.encrypted,
      key,
      encrypted.iv,
      encrypted.authTag
    );
    
    if (decrypted === testData) {
      console.log('✅ Encryption/Decryption working');
    } else {
      console.log('❌ Encryption/Decryption failed');
    }

    // Test blockchain storage (simulation)
    const transaction = await blockchainClient.storeHash(hash, {
      userId: 'test-user',
      credentialType: 'test',
      issuer: 'test-issuer'
    });
    
    console.log(`✅ Blockchain storage: ${transaction.txId.substring(0, 16)}...`);

    // Test transaction retrieval
    const retrieved = await blockchainClient.getTransaction(transaction.txId);
    if (retrieved) {
      console.log('✅ Transaction retrieval working');
    } else {
      console.log('❌ Transaction retrieval failed');
    }

    // Test hash verification
    const isValid = await blockchainClient.verifyHash(transaction.txId, hash);
    if (isValid) {
      console.log('✅ Hash verification working');
    } else {
      console.log('❌ Hash verification failed');
    }

  } catch (error) {
    console.error('❌ Blockchain function test failed:', error);
  }
}

// Run the setup
if (require.main === module) {
  setupBlockchain().catch(console.error);
}

export { setupBlockchain };