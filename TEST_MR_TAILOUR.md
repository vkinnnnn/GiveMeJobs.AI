# 🧪 Testing Mr.Tailour - Step by Step Guide

## Prerequisites ✅

- [x] Databases running (PostgreSQL, MongoDB, Redis)
- [x] Backend server running on port 4000
- [x] Frontend server running on port 3000
- [ ] OpenAI API key configured (REQUIRED for Mr.Tailour)

---

## Step 1: Configure OpenAI API Key

**IMPORTANT**: Mr.Tailour requires OpenAI API key to generate documents.

1. Get your API key from: https://platform.openai.com/api-keys
2. Add to `packages/backend/.env`:
   ```
   OPENAI_API_KEY=sk-your-actual-key-here
   ```
3. Restart backend server

---

## Step 2: Start the Application

### Terminal 1: Backend
```bash
cd packages/backend
npm run dev
```

**Expected output:**
```
Server running on port 4000
Database connected
MongoDB connected
Redis connected
```

### Terminal 2: Frontend
```bash
cd packages/frontend
npm run dev
```

**Expected output:**
```
- ready started server on 0.0.0.0:3000
- Local: http://localhost:3000
```

---

## Step 3: Create User Account

1. Open http://localhost:3000
2. Click **"Sign Up"** or **"Register"**
3. Fill in:
   - Email
   - Password
   - First Name
   - Last Name
4. Click **"Register"**
5. You should be automatically logged in

---

## Step 4: Complete Your Profile

### 4.1 Basic Information
1. Go to **Profile** or **Settings**
2. Add:
   - **Phone Number**
   - **Location** (e.g., "New York, NY")
   - **Professional Headline** (e.g., "Data Analyst" or "Senior Data Scientist")

### 4.2 Add Skills
1. Go to **Profile → Skills**
2. Add data analytics skills:
   - **Python** (Proficiency: 4, Years: 3)
   - **SQL** (Proficiency: 5, Years: 4)
   - **Tableau** (Proficiency: 4, Years: 2)
   - **Excel** (Proficiency: 5, Years: 5)
   - **Statistics** (Proficiency: 4, Years: 3)
   - **Data Visualization** (Proficiency: 4, Years: 2)
   - **Machine Learning** (if applicable)
   - **R** (if applicable)

### 4.3 Add Work Experience
1. Go to **Profile → Experience**
2. Click **"Add Experience"**
3. For each job, add:
   - **Company Name**
   - **Job Title** (e.g., "Data Analyst", "Business Analyst")
   - **Start Date**
   - **End Date** (or mark "Current")
   - **Description**: Describe your data analytics work
     - Example: "Analyzed large datasets using SQL and Python to identify business trends and patterns. Created interactive dashboards in Tableau for stakeholders."
   - **Achievements** (bullet points):
     - "Improved reporting efficiency by 40%"
     - "Created dashboards used by 50+ stakeholders"
     - "Identified cost-saving opportunities worth $500K"

### 4.4 Add Education
1. Go to **Profile → Education**
2. Click **"Add Education"**
3. Add:
   - **Institution**
   - **Degree** (e.g., "Bachelor of Science")
   - **Field of Study** (e.g., "Data Science", "Statistics", "Computer Science")
   - **Start Date**
   - **End Date**
   - **GPA** (optional)

---

## Step 5: Find and Save a Data Analytics Job

### Option A: Search for Jobs
1. Go to **Jobs** section
2. Search for "data analyst" or "data analytics"
3. Browse results
4. Click **"Save"** on a job you like

### Option B: Create Test Job (if no jobs available)
If you need a test job, you can create one via API:

```bash
# Get your JWT token after login
TOKEN="your-jwt-token"

curl -X POST http://localhost:4000/api/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Data Analyst",
    "company": "TechCorp",
    "location": "Remote",
    "description": "We are seeking a Senior Data Analyst to join our team. You will analyze large datasets, create visualizations, and provide insights to stakeholders. Required skills: Python, SQL, Tableau, Statistics.",
    "requirements": "Bachelor'\''s degree in Data Science or related field. 3+ years of experience in data analysis. Proficiency in Python, SQL, and data visualization tools.",
    "salary_min": 80000,
    "salary_max": 120000
  }'
```

---

## Step 6: Generate Resume with Mr.Tailour

1. Go to **Documents** → **Generate Document**
2. Select options:
   - **Document Type**: Resume
   - **Job**: Select the data analytics job you saved
   - **Template**: Default (or choose one)
   - **Tone**: Professional (recommended)
   - **Length**: Standard
   - **Focus Areas**: 
     - "data analysis"
     - "statistics"
     - "data visualization"
     - "business intelligence"
3. Click **"Generate Resume"**
4. **Wait 5-10 seconds** for AI generation
5. You'll be redirected to the document editor

---

## Step 7: Review Generated Resume

The generated resume should:
- ✅ Include your name and contact info
- ✅ Have a professional summary tailored to data analytics
- ✅ Highlight relevant experience
- ✅ List skills prioritized by job requirements
- ✅ Include education
- ✅ Use keywords from the job description

---

## Step 8: Edit Document (Optional)

1. In the document editor, you can:
   - Edit any section
   - Add/remove content
   - Adjust formatting
2. Click **"Save Changes"** to create a new version

---

## Step 9: Export Document

1. Click **"Export"** button
2. Choose format:
   - **PDF** (recommended for applications)
   - **DOCX** (for further editing in Word)
   - **TXT** (for ATS systems)
3. File will download automatically

---

## Step 10: Test Cover Letter Generation

1. Go to **Documents** → **Generate Document**
2. Select:
   - **Document Type**: Cover Letter
   - **Job**: Same data analytics job
   - **Tone**: Professional or Enthusiastic
3. Click **"Generate Cover Letter"**
4. Review the personalized cover letter

---

## 🧪 API Testing (Advanced)

### Test Document Generation Endpoint

```bash
# Set your token and job ID
TOKEN="your-jwt-token"
JOB_ID="your-job-id"

# Generate Resume
curl -X POST http://localhost:4000/api/documents/generate/resume \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "'$JOB_ID'",
    "customizations": {
      "tone": "professional",
      "length": "standard",
      "focusAreas": ["data analysis", "statistics", "visualization"]
    }
  }'
```

### Test Document Export

```bash
DOCUMENT_ID="generated-document-id"

# Export as PDF
curl -X GET "http://localhost:4000/api/documents/$DOCUMENT_ID/export?format=pdf" \
  -H "Authorization: Bearer $TOKEN" \
  --output resume.pdf
```

---

## ✅ Testing Checklist

### Basic Functionality
- [ ] User can register/login
- [ ] User can complete profile
- [ ] User can add skills
- [ ] User can add experience
- [ ] User can add education
- [ ] User can save a job
- [ ] User can generate resume
- [ ] Resume is tailored to job
- [ ] User can edit document
- [ ] User can export document (PDF)
- [ ] User can export document (DOCX)
- [ ] User can generate cover letter

### Mr.Tailour Specific
- [ ] Resume includes job-relevant keywords
- [ ] Experience is tailored to job requirements
- [ ] Skills are prioritized by relevance
- [ ] Professional summary matches job
- [ ] Document formatting is correct
- [ ] Version control works
- [ ] Template selection works

### Error Handling
- [ ] Error when OpenAI key missing
- [ ] Error when profile incomplete
- [ ] Error when job not found
- [ ] User-friendly error messages

---

## 🐛 Troubleshooting

### "AI service is not configured"
**Fix**: Add `OPENAI_API_KEY` to `packages/backend/.env` and restart backend

### "User profile not found"
**Fix**: Complete your profile with skills, experience, and education

### "Job not found"
**Fix**: Make sure you saved the job or it exists in the database

### Generation takes too long (>15 seconds)
**Normal**: First generation may take longer. Subsequent ones should be 5-10 seconds.

### Document looks generic
**Fix**: 
- Add more detailed experience descriptions
- Add more skills
- Ensure job description is detailed

---

## 📊 Expected Results

### Resume Generation Time
- **Target**: 5-10 seconds
- **Acceptable**: Up to 15 seconds
- **Too Slow**: >20 seconds (check OpenAI API status)

### Document Quality
- Should be tailored to the specific job
- Should include relevant keywords
- Should highlight matching skills/experience
- Should be professionally formatted

---

## 🎯 Next Steps

After successful testing:
1. Test with different job types
2. Test different tones (professional, casual, enthusiastic)
3. Test different lengths (concise, standard, detailed)
4. Test template variations
5. Test version control
6. Test export formats

---

**Happy Testing! 🚀**



