/**
 * Resume Parser Helper Script
 * 
 * This script helps extract information from your resume to populate your profile
 * for Mr.Tailour document generation.
 * 
 * Usage:
 * 1. Open your resume file
 * 2. Copy and paste the content below
 * 3. Run this script to get structured data
 * 4. Use the output to update your profile via API or UI
 */

// Paste your resume content here (text format)
const resumeContent = `
PASTE YOUR RESUME CONTENT HERE
Copy text from your Word document and paste it above
`;

/**
 * Extract profile information from resume text
 */
function parseResume(resumeText) {
  const profile = {
    personalInfo: {},
    skills: [],
    experience: [],
    education: []
  };

  // Extract name (usually first line or after "Name:")
  const nameMatch = resumeText.match(/(?:Name|NAME)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
  if (nameMatch) {
    const nameParts = nameMatch[1].trim().split(/\s+/);
    profile.personalInfo.firstName = nameParts[0];
    profile.personalInfo.lastName = nameParts.slice(1).join(' ');
  }

  // Extract email
  const emailMatch = resumeText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    profile.personalInfo.email = emailMatch[1];
  }

  // Extract phone
  const phoneMatch = resumeText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    profile.personalInfo.phone = phoneMatch[0];
  }

  // Extract location
  const locationMatch = resumeText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})/);
  if (locationMatch) {
    profile.personalInfo.location = locationMatch[1];
  }

  // Extract skills (look for "Skills:" section)
  const skillsSection = resumeText.match(/Skills?[:\s]+(.*?)(?:\n\n|\n[A-Z]|$)/is);
  if (skillsSection) {
    const skillsText = skillsSection[1];
    // Split by commas, semicolons, or bullets
    profile.skills = skillsText
      .split(/[,;•\-\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length < 50)
      .slice(0, 50); // Limit to 50 skills
  }

  // Extract experience (look for "Experience" or "Work Experience" section)
  const experienceSection = resumeText.match(/Experience[:\s]+(.*?)(?:Education|Education|$)/is);
  if (experienceSection) {
    const expText = experienceSection[1];
    // Try to extract job entries
    const jobMatches = expText.match(/([A-Z][^\n]+)\n([^\n]+)\n([^\n]+(?:\n[^\n]+)*?)(?=\n[A-Z]|\n\n|$)/g);
    if (jobMatches) {
      jobMatches.forEach(match => {
        const lines = match.split('\n').filter(l => l.trim());
        if (lines.length >= 2) {
          profile.experience.push({
            title: lines[0]?.trim() || '',
            company: lines[1]?.trim() || '',
            period: lines[2]?.trim() || '',
            description: lines.slice(3).join(' ').trim() || ''
          });
        }
      });
    }
  }

  // Extract education
  const educationSection = resumeText.match(/Education[:\s]+(.*?)(?:Skills|Experience|$)/is);
  if (educationSection) {
    const eduText = educationSection[1];
    const eduMatches = eduText.match(/([^\n]+)\n([^\n]+)\n([^\n]+)/g);
    if (eduMatches) {
      eduMatches.forEach(match => {
        const lines = match.split('\n').filter(l => l.trim());
        if (lines.length >= 2) {
          profile.education.push({
            degree: lines[0]?.trim() || '',
            institution: lines[1]?.trim() || '',
            period: lines[2]?.trim() || ''
          });
        }
      });
    }
  }

  return profile;
}

// Run parser
if (resumeContent.trim() !== 'PASTE YOUR RESUME CONTENT HERE') {
  const parsed = parseResume(resumeContent);
  console.log('\n=== PARSED PROFILE DATA ===\n');
  console.log(JSON.stringify(parsed, null, 2));
  
  console.log('\n=== API REQUEST FORMAT ===\n');
  console.log('Use this to update your profile via API:\n');
  
  // Generate API request format
  const apiData = {
    firstName: parsed.personalInfo.firstName,
    lastName: parsed.personalInfo.lastName,
    phone: parsed.personalInfo.phone,
    location: parsed.personalInfo.location,
    skills: parsed.skills.map(skill => ({
      name: skill,
      category: 'technical', // You may need to categorize
      proficiencyLevel: 3, // Default, update as needed
      yearsOfExperience: 2 // Default, update as needed
    })),
    experience: parsed.experience.map(exp => ({
      title: exp.title,
      company: exp.company,
      description: exp.description,
      startDate: new Date().toISOString(), // Update with actual dates
      current: false // Update based on period
    })),
    education: parsed.education.map(edu => ({
      institution: edu.institution,
      degree: edu.degree,
      startDate: new Date().toISOString(), // Update with actual dates
      endDate: new Date().toISOString() // Update with actual dates
    }))
  };
  
  console.log(JSON.stringify(apiData, null, 2));
} else {
  console.log('Please paste your resume content in the resumeContent variable above.');
}



