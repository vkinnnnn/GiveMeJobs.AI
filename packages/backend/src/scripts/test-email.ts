import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import { EmailService } from '../services/email.service';

/**
 * Test Email Service
 * Run with: npm run test:email
 */
async function testEmailService() {
  console.log('🧪 Testing Email Service...\n');

  const emailService = new EmailService();

  try {
    // Use your own email for testing (Resend requirement)
    const testEmail = 'vkinnnnn@gmail.com';
    
    // Test 1: Send welcome email
    console.log('📧 Test 1: Sending welcome email...');
    await emailService.sendWelcomeEmail(testEmail, 'Test User');
    console.log('✅ Welcome email sent successfully\n');

    // Test 2: Send password reset email
    console.log('📧 Test 2: Sending password reset email...');
    await emailService.sendPasswordResetEmail(testEmail, 'test-token-123');
    console.log('✅ Password reset email sent successfully\n');

    // Test 3: Send password changed email
    console.log('📧 Test 3: Sending password changed email...');
    await emailService.sendPasswordChangedEmail(testEmail, 'Test User');
    console.log('✅ Password changed email sent successfully\n');

    console.log('✅ All email tests passed!');
    console.log('\n📝 Note: Using Resend email service');
    console.log('📝 Check your Resend dashboard for sent emails: https://resend.com/emails');

    process.exit(0);
  } catch (error) {
    console.error('❌ Email test failed:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Check if RESEND_API_KEY is set in .env');
    console.error('   - Verify EMAIL_FROM is configured');
    console.error('   - Check Resend dashboard: https://resend.com/');
    process.exit(1);
  }
}

testEmailService();
