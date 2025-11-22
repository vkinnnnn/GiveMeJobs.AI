# Guide: Adding Your Resume Data to Mr.Tailour Profile

Since Mr.Tailour needs your profile data in the database to generate tailored resumes, here's how to add your resume information:

## Option 1: Manual Entry via UI (Recommended)

1. **Log into the application**
2. **Go to Profile Settings** (`/profile` or `/settings`)
3. **Fill in the following sections:**

### Personal Information
- First Name
- Last Name
- Email
- Phone
- Location
- Professional Headline (e.g., "Data Analyst" or "Senior Data Scientist")

### Skills Section
- Add each skill from your resume
- For each skill, specify:
  - **Name**: e.g., "Python", "SQL", "Tableau"
  - **Category**: Technical, Soft Skills, Tools, etc.
  - **Proficiency Level**: 1-5 (1=Beginner, 5=Expert)
  - **Years of Experience**: Number of years

### Experience Section
For each job:
- **Company Name**
- **Job Title**
- **Start Date**
- **End Date** (or mark as "Current")
- **Description**: What you did in this role
- **Achievements**: Key accomplishments (bullet points)

### Education Section
For each degree/certification:
- **Institution**
- **Degree** (e.g., "Bachelor of Science")
- **Field of Study** (e.g., "Computer Science", "Statistics")
- **Start Date**
- **End Date**
- **GPA** (optional)

---

## Option 2: Using API (For Developers)

### Step 1: Update Profile
```bash
PUT /api/users/{userId}/profile
Authorization: Bearer {your-jwt-token}

{
  "firstName": "Chirag",
  "lastName": "Verma",
  "phone": "+1-xxx-xxx-xxxx",
  "location": "Your City, State",
  "professionalHeadline": "Data Analyst"
}
```

### Step 2: Add Skills
```bash
POST /api/users/{userId}/skills
Authorization: Bearer {your-jwt-token}

{
  "name": "Python",
  "category": "Programming",
  "proficiencyLevel": 4,
  "yearsOfExperience": 3
}
```

Repeat for each skill:
- SQL
- Tableau/Power BI
- Excel
- R (if applicable)
- Machine Learning (if applicable)
- Statistics
- Data Visualization
- etc.

### Step 3: Add Experience
```bash
POST /api/users/{userId}/experience
Authorization: Bearer {your-jwt-token}

{
  "company": "Company Name",
  "title": "Data Analyst",
  "startDate": "2020-01-01T00:00:00Z",
  "endDate": "2023-12-31T00:00:00Z",
  "current": false,
  "description": "Analyzed large datasets to identify trends and patterns...",
  "achievements": [
    "Improved reporting efficiency by 40%",
    "Created dashboards used by 50+ stakeholders"
  ]
}
```

### Step 4: Add Education
```bash
POST /api/users/{userId}/education
Authorization: Bearer {your-jwt-token}

{
  "institution": "University Name",
  "degree": "Bachelor of Science",
  "fieldOfStudy": "Data Science / Statistics / Computer Science",
  "startDate": "2015-09-01T00:00:00Z",
  "endDate": "2019-06-01T00:00:00Z",
  "gpa": 3.8
}
```

---

## Option 3: Quick Script (If You Share Resume Content)

If you can share your resume content (text format), I can:
1. Parse it automatically
2. Generate the API requests for you
3. Create a script to populate your profile

**To do this:**
1. Open your resume Word document
2. Copy all the text (Ctrl+A, Ctrl+C)
3. Share it with me, and I'll extract:
   - Your name, contact info
   - All skills
   - All work experience
   - Education details
4. I'll provide you with:
   - Structured JSON data
   - API requests ready to use
   - Or a script to run

---

## After Adding Profile Data

Once your profile is complete:

1. **Find a Data Analytics Job** in the job search
2. **Save the job** to your saved jobs
3. **Go to Documents → Generate**
4. **Select the data analytics job**
5. **Choose options:**
   - Tone: Professional (recommended for data roles)
   - Length: Standard
   - Focus Areas: "data analysis", "statistics", "visualization" (optional)
6. **Click "Generate Resume"**
7. **Mr.Tailour will:**
   - Analyze the job description
   - Match your skills and experience to job requirements
   - Generate a tailored resume highlighting relevant data analytics experience
   - Format it professionally

---

## Example: Data Analytics Job Focus Areas

When generating a resume for a data analytics job, you might want to emphasize:

**Focus Areas to add:**
- Data analysis
- Statistical analysis
- Data visualization
- SQL and database management
- Python/R programming
- Business intelligence
- Reporting and dashboards
- Machine learning (if applicable)

---

## Need Help?

If you need assistance:
1. Share your resume content (text format) and I'll parse it
2. Tell me which option you prefer (UI, API, or script)
3. I can create a custom script for your specific resume format

---

**Next Steps:**
1. Choose an option above
2. Add your profile data
3. Find a data analytics job
4. Generate your tailored resume with Mr.Tailour!



