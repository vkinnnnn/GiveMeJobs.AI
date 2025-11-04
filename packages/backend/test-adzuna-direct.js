// Direct test of Adzuna API credentials
const axios = require('axios');

const APP_ID = 'ab00c272';
const APP_KEY = '012b349adec137d5ac6c637f8a03d610';

async function testAdzuna() {
  console.log('🧪 Testing Adzuna API Credentials...\n');
  console.log(`App ID: ${APP_ID}`);
  console.log(`App Key: ${APP_KEY.substring(0, 10)}...`);
  console.log('');

  try {
    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1`;
    console.log(`📡 Calling: ${url}`);
    console.log('');

    const response = await axios.get(url, {
      params: {
        app_id: APP_ID,
        app_key: APP_KEY,
        what: 'software developer',
        where: 'New York',
        results_per_page: 5,
      },
      timeout: 10000,
    });

    console.log('✅ SUCCESS! API credentials are working!\n');
    console.log(`📊 Found ${response.data.results.length} jobs\n`);
    
    if (response.data.results.length > 0) {
      const job = response.data.results[0];
      console.log('📋 First Job:');
      console.log(`   Title: ${job.title}`);
      console.log(`   Company: ${job.company.display_name}`);
      console.log(`   Location: ${job.location.display_name}`);
      console.log(`   URL: ${job.redirect_url}`);
    }

  } catch (error) {
    console.log('❌ FAILED!\n');
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
      console.log('');
      console.log('💡 Possible issues:');
      console.log('   1. App ID or App Key is incorrect');
      console.log('   2. Adzuna account not activated');
      console.log('   3. API access not enabled');
      console.log('');
      console.log('🔧 Solutions:');
      console.log('   1. Double-check credentials at https://developer.adzuna.com/');
      console.log('   2. Make sure you verified your email');
      console.log('   3. Check if your application is approved');
    } else {
      console.log(`Error: ${error.message}`);
    }
  }
}

testAdzuna();
