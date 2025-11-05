import { chromium, FullConfig } from '@playwright/test';
import { pgPool } from '../../../config/database';
import { redisClient } from '../../../config/redis-config';

/**
 * Global Setup for Playwright E2E Tests
 * 
 * This setup runs once before all tests and:
 * - Initializes test database
 * - Sets up test data
 * - Configures authentication state
 * - Prepares test environment
 * 
 * Requirements: 14.3 - End-to-end testing setup
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test environment setup...');

  try {
    // Wait for services to be ready
    await waitForServices();

    // Setup test database
    await setupTestDatabase();

    // Create test users and data
    await createTestData();

    // Setup authentication states
    await setupAuthStates(config);

    console.log('✅ E2E test environment setup completed successfully');
  } catch (error) {
    console.error('❌ E2E test environment setup failed:', error);
    throw error;
  }
}

/**
 * Wait for required services to be ready
 */
async function waitForServices() {
  console.log('⏳ Waiting for services to be ready...');

  // Wait for backend API
  await waitForService('http://localhost:3000/api/health', 'Backend API');

  // Wait for Python services
  await waitForService('http://localhost:8000/health', 'Python Services');

  // Wait for database
  await waitForDatabase();

  // Wait for Redis
  await waitForRedis();
}

/**
 * Wait for a specific service to be ready
 */
async function waitForService(url: string, serviceName: string, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ ${serviceName} is ready`);
        return;
      }
    } catch (error) {
      // Service not ready yet
    }

    console.log(`⏳ Waiting for ${serviceName}... (${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error(`${serviceName} failed to start within timeout`);
}

/**
 * Wait for database to be ready
 */
async function waitForDatabase() {
  try {
    await pgPool.query('SELECT 1');
    console.log('✅ Database is ready');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

/**
 * Wait for Redis to be ready
 */
async function waitForRedis() {
  try {
    await redisClient.ping();
    console.log('✅ Redis is ready');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
}

/**
 * Setup test database with clean state
 */
async function setupTestDatabase() {
  console.log('🗄️ Setting up test database...');

  try {
    // Clean existing test data
    await pgPool.query(`
      DELETE FROM user_profiles WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%e2e.test%'
      )
    `);
    
    await pgPool.query(`
      DELETE FROM job_applications WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%e2e.test%'
      )
    `);
    
    await pgPool.query(`
      DELETE FROM users WHERE email LIKE '%e2e.test%'
    `);

    // Clean Redis test data
    const keys = await redisClient.keys('*e2e*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    console.log('✅ Test database cleaned');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}

/**
 * Create test data for E2E tests
 */
async function createTestData() {
  console.log('📊 Creating test data...');

  try {
    // Create test users
    const testUsers = [
      {
        email: 'admin.e2e.test@example.com',
        password: 'AdminTest123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      },
      {
        email: 'user.e2e.test@example.com',
        password: 'UserTest123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      },
      {
        email: 'premium.e2e.test@example.com',
        password: 'PremiumTest123!',
        firstName: 'Premium',
        lastName: 'User',
        role: 'premium',
      },
    ];

    for (const user of testUsers) {
      // Create user via API to ensure proper setup
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          firstName: user.firstName,
          lastName: user.lastName,
          professionalHeadline: 'E2E Test User',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.warn(`Failed to create test user ${user.email}:`, error);
      } else {
        console.log(`✅ Created test user: ${user.email}`);
      }
    }

    // Create test job postings
    await createTestJobs();

    console.log('✅ Test data created successfully');
  } catch (error) {
    console.error('❌ Test data creation failed:', error);
    throw error;
  }
}

/**
 * Create test job postings
 */
async function createTestJobs() {
  const testJobs = [
    {
      title: 'Senior Software Engineer - E2E Test',
      company: 'Test Company Inc',
      location: 'San Francisco, CA',
      description: 'This is a test job posting for E2E testing purposes.',
      requirements: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
      salary_min: 120000,
      salary_max: 180000,
      job_type: 'full-time',
      remote_allowed: true,
    },
    {
      title: 'Frontend Developer - E2E Test',
      company: 'Test Startup LLC',
      location: 'New York, NY',
      description: 'Frontend developer position for E2E testing.',
      requirements: ['React', 'CSS', 'HTML', 'JavaScript'],
      salary_min: 80000,
      salary_max: 120000,
      job_type: 'full-time',
      remote_allowed: false,
    },
  ];

  for (const job of testJobs) {
    try {
      await pgPool.query(`
        INSERT INTO job_postings (
          title, company, location, description, requirements,
          salary_min, salary_max, job_type, remote_allowed,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (title, company) DO NOTHING
      `, [
        job.title,
        job.company,
        job.location,
        job.description,
        JSON.stringify(job.requirements),
        job.salary_min,
        job.salary_max,
        job.job_type,
        job.remote_allowed,
      ]);

      console.log(`✅ Created test job: ${job.title}`);
    } catch (error) {
      console.warn(`Failed to create test job ${job.title}:`, error);
    }
  }
}

/**
 * Setup authentication states for different user types
 */
async function setupAuthStates(config: FullConfig) {
  console.log('🔐 Setting up authentication states...');

  const browser = await chromium.launch();
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  try {
    // Setup admin user auth state
    await setupUserAuthState(browser, baseURL, {
      email: 'admin.e2e.test@example.com',
      password: 'AdminTest123!',
      statePath: 'playwright/.auth/admin.json',
    });

    // Setup regular user auth state
    await setupUserAuthState(browser, baseURL, {
      email: 'user.e2e.test@example.com',
      password: 'UserTest123!',
      statePath: 'playwright/.auth/user.json',
    });

    // Setup premium user auth state
    await setupUserAuthState(browser, baseURL, {
      email: 'premium.e2e.test@example.com',
      password: 'PremiumTest123!',
      statePath: 'playwright/.auth/premium.json',
    });

    console.log('✅ Authentication states setup completed');
  } catch (error) {
    console.error('❌ Authentication states setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Setup authentication state for a specific user
 */
async function setupUserAuthState(browser: any, baseURL: string, user: {
  email: string;
  password: string;
  statePath: string;
}) {
  const page = await browser.newPage();

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);

    // Fill login form
    await page.fill('[data-testid="email-input"]', user.email);
    await page.fill('[data-testid="password-input"]', user.password);

    // Submit login
    await page.click('[data-testid="login-button"]');

    // Wait for successful login (redirect to dashboard)
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Save authentication state
    await page.context().storageState({ path: user.statePath });

    console.log(`✅ Auth state saved for ${user.email}`);
  } catch (error) {
    console.error(`❌ Failed to setup auth state for ${user.email}:`, error);
    throw error;
  } finally {
    await page.close();
  }
}

export default globalSetup;