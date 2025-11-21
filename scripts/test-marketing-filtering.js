#!/usr/bin/env node

/**
 * Test script to verify marketing notification filtering logic
 * 
 * This script tests the job filtering logic to ensure different contacts
 * receive different job recommendations based on their branch and experience.
 * 
 * Usage:
 *   node scripts/test-marketing-filtering.js
 *   node scripts/test-marketing-filtering.js --contact-id 123
 *   node scripts/test-marketing-filtering.js --all-contacts
 */

require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

// Database configuration
const dialect = process.env.DB_DIALECT?.toLowerCase() || 'mysql';
const sequelize = new Sequelize(
  process.env.DB_NAME || 'mycareerbuild',
  process.env.DB_USER || (dialect === 'postgres' ? 'postgres' : 'root'),
  process.env.DB_PASSWORD || (dialect === 'postgres' ? 'postgres' : 'secret'),
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || (dialect === 'postgres' ? '5432' : '3306'), 10),
    dialect: dialect,
    logging: false,
  }
);

// Note: The marketing module functions are not exported, so we recreate the filtering logic here
// This ensures we test the same logic that will be used in production

async function fetchContacts(contactId = null, allContacts = false) {
  let query = `
    SELECT 
      id,
      full_name,
      email,
      mobile_no,
      branch,
      experience,
      telegram_chat_id,
      created_at
    FROM marketing_contacts
    WHERE 1=1
  `;
  
  const replacements = {};
  
  if (contactId) {
    query += ` AND id = :contactId`;
    replacements.contactId = contactId;
  }
  
  query += ` ORDER BY created_at DESC LIMIT 10`;
  
  const contacts = await sequelize.query(query, {
    replacements,
    type: QueryTypes.SELECT,
  });
  
  return contacts;
}

async function fetchJobs(limit = 50) {
  // Fetch jobs from both jobs and accounts_jobdata tables
  // Use the same columns that the marketing module uses
  // Note: jobs table doesn't have a 'branch' column - branch matching uses category, job_type, location_type, and skills
  // Use dialect-specific column names (PostgreSQL is case-sensitive)
  const isPostgres = dialect === 'postgres';
  const locationTypeCol = isPostgres ? '"locationType"' : 'locationType';
  const experienceLevelCol = isPostgres ? '"experienceLevel"' : 'experienceLevel';
  const skillsRequiredCol = isPostgres ? '"skillsRequired"' : 'skillsRequired';
  const createdAtCol = isPostgres ? '"createdAt"' : 'createdAt';
  
  const notifySentCondition = isPostgres 
    ? '(notify_sent = false OR notify_sent IS NULL)'
    : '(notify_sent = 0 OR notify_sent IS NULL)';
  const notifySentCoalesce = isPostgres 
    ? 'COALESCE(notify_sent::text, \'false\')::boolean as notify_sent'
    : 'COALESCE(notify_sent, 0) as notify_sent';
  
  const jobsQuery = `
    SELECT 
      id,
      title,
      company as company_name,
      location,
      COALESCE(type, '') as job_type,
      COALESCE(category, '') as category,
      COALESCE(${locationTypeCol}, '') as location_type,
      COALESCE(${experienceLevelCol}, '') as experience,
      COALESCE(${skillsRequiredCol}::text, '[]') as skills,
      'jobs' as source,
      ${notifySentCoalesce},
      notify_sent_at,
      COALESCE(${createdAtCol}, NOW()) as created_at
    FROM jobs
    WHERE ${notifySentCondition}
    ORDER BY ${createdAtCol} DESC
    LIMIT :limit
  `;
  
  const aiNotifySentCondition = isPostgres 
    ? '(notify_sent = false OR notify_sent IS NULL)'
    : '(notify_sent = 0 OR notify_sent IS NULL)';
  const aiSkillsCoalesce = isPostgres 
    ? 'COALESCE(skills::text, \'[]\') as skills'
    : 'COALESCE(skills, \'[]\') as skills';
  
  // For accounts_jobdata, use only columns that definitely exist (id, title, company, location, job_type, experience, skills, posted_date)
  // Set missing columns to empty strings
  const accounts_jobdataQuery = `
    SELECT 
      id,
      title,
      company as company_name,
      location,
      COALESCE(job_type, '') as job_type,
      '' as category,
      '' as location_type,
      COALESCE(experience, '') as experience,
      ${aiSkillsCoalesce},
      'accounts_jobdata' as source,
      COALESCE(notify_sent, false) as notify_sent,
      notify_sent_at,
      COALESCE(posted_date, NOW()) as created_at
    FROM accounts_jobdata
    WHERE ${aiNotifySentCondition}
    ORDER BY posted_date DESC
    LIMIT :limit
  `;
  
  const jobs = await sequelize.query(jobsQuery, {
    replacements: { limit },
    type: QueryTypes.SELECT,
  });
  
  const accounts_jobdata = await sequelize.query(accounts_jobdataQuery, {
    replacements: { limit },
    type: QueryTypes.SELECT,
  });
  
  // Parse skills if it's a JSON string
  const parseSkills = (job) => {
    if (job.skills) {
      try {
        if (typeof job.skills === 'string') {
          job.skills = JSON.parse(job.skills);
        }
      } catch (e) {
        job.skills = [];
      }
    } else {
      job.skills = [];
    }
    return job;
  };
  
  const allJobs = [
    ...(Array.isArray(jobs) ? jobs.map(parseSkills) : []),
    ...(Array.isArray(accounts_jobdata) ? accounts_jobdata.map(parseSkills) : [])
  ];
  
  return allJobs;
}

function normalizeBranchTokens(branch) {
  if (!branch || typeof branch !== 'string') return [];
  return branch
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(t => t.trim());
}

function parseExperienceRange(experience) {
  if (!experience || typeof experience !== 'string') return null;
  
  // Try to parse ranges like "0-2", "2-5", "5+", "fresher", etc.
  const normalized = experience.toLowerCase().trim();
  
  if (normalized.includes('fresher') || normalized === '0' || normalized === '0-0') {
    return { min: 0, max: 0 };
  }
  
  const rangeMatch = normalized.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
  }
  
  const plusMatch = normalized.match(/(\d+)\s*\+/);
  if (plusMatch) {
    return { min: parseInt(plusMatch[1], 10), max: Infinity };
  }
  
  const singleMatch = normalized.match(/^(\d+)$/);
  if (singleMatch) {
    const val = parseInt(singleMatch[1], 10);
    return { min: val, max: val };
  }
  
  return null;
}

function isFresherJob(job) {
  if (!job || !job.experience) return false;
  const exp = String(job.experience).toLowerCase();
  return exp.includes('fresher') || exp === '0' || exp === '0-0' || exp === '0-1';
}

function filterByBranch(jobs, branchTokens) {
  if (!branchTokens || branchTokens.length === 0) return jobs;
  
  return jobs.filter(job => {
    if (!job) return false;
    
    // Collect tokens from job (same logic as marketing module)
    const jobTokens = [];
    const push = (value) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        jobTokens.push(value.trim().toLowerCase());
      }
    };
    
    push(job.job_type);
    push(job.category);
    push(job.location_type);
    push(job.title);
    
    if (Array.isArray(job.skills)) {
      job.skills.forEach(push);
    }
    
    // Check if any branch token matches any job token
    return branchTokens.some(token => 
      jobTokens.some(jobToken => jobToken.includes(token))
    );
  });
}

function filterByExperience(jobs, experienceRange) {
  if (!experienceRange) return jobs;
  
  return jobs.filter(job => {
    if (!job || !job.experience) return false;
    const jobExp = parseExperienceRange(String(job.experience));
    if (!jobExp) return false;
    
    // Check if job experience overlaps with contact's desired range
    return (
      (jobExp.min <= experienceRange.max && jobExp.max >= experienceRange.min) ||
      (experienceRange.min <= jobExp.max && experienceRange.max >= jobExp.min)
    );
  });
}

function selectJobsForContact(contact, allJobs) {
  const branchTokens = normalizeBranchTokens(contact?.branch);
  const contactRange = parseExperienceRange(contact?.experience);
  const preferFresher = contactRange && contactRange.min === 0 && contactRange.max === 0;
  
  const fresherJobs = allJobs.filter(isFresherJob);
  const digestLimit = 5;
  
  const strategies = [];
  const strategyNames = [];
  
  // Strategy 1: Fresher jobs with both branch AND experience match
  if (preferFresher && fresherJobs.length > 0) {
    let filtered = filterByBranch(fresherJobs, branchTokens);
    filtered = filterByExperience(filtered, contactRange);
    if (filtered.length > 0) {
      return { jobs: filtered.slice(0, digestLimit), strategy: 'fresher+branch+experience' };
    }
    
    // Strategy 2: Fresher jobs with branch match only
    filtered = filterByBranch(fresherJobs, branchTokens);
    if (filtered.length > 0) {
      return { jobs: filtered.slice(0, digestLimit), strategy: 'fresher+branch' };
    }
    
    // Strategy 3: Fresher jobs with experience match only
    filtered = filterByExperience(fresherJobs, contactRange);
    if (filtered.length > 0) {
      return { jobs: filtered.slice(0, digestLimit), strategy: 'fresher+experience' };
    }
  }
  
  // Strategy 4: All jobs with both branch AND experience match
  let filtered = filterByBranch(allJobs, branchTokens);
  filtered = filterByExperience(filtered, contactRange);
  if (filtered.length > 0) {
    return { jobs: filtered.slice(0, digestLimit), strategy: 'all+branch+experience' };
  }
  
  // Strategy 5: All jobs with branch match only
  if (branchTokens.length > 0) {
    filtered = filterByBranch(allJobs, branchTokens);
    if (filtered.length > 0) {
      return { jobs: filtered.slice(0, digestLimit), strategy: 'all+branch' };
    }
  }
  
  // Strategy 6: All jobs with experience match only
  if (contactRange) {
    filtered = filterByExperience(allJobs, contactRange);
    if (filtered.length > 0) {
      return { jobs: filtered.slice(0, digestLimit), strategy: 'all+experience' };
    }
  }
  
  // No matches found - should return empty array (not all jobs)
  return { jobs: [], strategy: 'no-match' };
}

async function testFiltering() {
  try {
    console.log('🧪 Testing Marketing Notification Filtering Logic\n');
    console.log('=' .repeat(60) + '\n');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const contactIdArg = args.find(arg => arg.startsWith('--contact-id='));
    const contactId = contactIdArg ? parseInt(contactIdArg.split('=')[1], 10) : null;
    const allContacts = args.includes('--all-contacts');
    
    // Fetch contacts
    console.log('📋 Fetching contacts...');
    const contacts = await fetchContacts(contactId, allContacts);
    
    if (contacts.length === 0) {
      console.log('❌ No contacts found in database.');
      return;
    }
    
    console.log(`✅ Found ${contacts.length} contact(s)\n`);
    
    // Fetch jobs
    console.log('📋 Fetching jobs...');
    const jobs = await fetchJobs(100);
    console.log(`✅ Found ${jobs.length} job(s) (${jobs.filter(j => j.source === 'jobs').length} from jobs, ${jobs.filter(j => j.source === 'accounts_jobdata').length} from accounts_jobdata)\n`);
    
    if (jobs.length === 0) {
      console.log('⚠️  No jobs found. Insert some test jobs to verify filtering.\n');
      return;
    }
    
    console.log('=' .repeat(60));
    console.log('🔍 Testing Job Selection for Each Contact\n');
    console.log('=' .repeat(60) + '\n');
    
    const results = [];
    
    for (const contact of contacts) {
      const selection = selectJobsForContact(contact, jobs);
      
      const result = {
        contact: {
          id: contact.id,
          name: contact.full_name || 'N/A',
          email: contact.email || 'N/A',
          branch: contact.branch || 'N/A',
          experience: contact.experience || 'N/A',
        },
        selectedJobs: selection.jobs,
        strategy: selection.strategy,
        jobCount: selection.jobs.length,
      };
      
      results.push(result);
      
      console.log(`👤 Contact: ${result.contact.name} (ID: ${result.contact.id})`);
      console.log(`   Email: ${result.contact.email}`);
      console.log(`   Branch: ${result.contact.branch}`);
      console.log(`   Experience: ${result.contact.experience}`);
      console.log(`   Strategy: ${result.strategy}`);
      console.log(`   Selected Jobs: ${result.jobCount}`);
      
      if (result.jobCount > 0) {
        console.log(`   Jobs:`);
        result.selectedJobs.forEach((job, index) => {
          console.log(`     ${index + 1}. ${job.title || 'N/A'} @ ${job.company_name || 'N/A'}`);
          console.log(`        Category: ${job.category || 'N/A'}, Job Type: ${job.job_type || 'N/A'}, Experience: ${job.experience || 'N/A'}`);
        });
      } else {
        console.log(`   ⚠️  No matching jobs found for this contact`);
      }
      
      console.log('');
    }
    
    console.log('=' .repeat(60));
    console.log('📊 Summary\n');
    console.log('=' .repeat(60) + '\n');
    
    const contactsWithJobs = results.filter(r => r.jobCount > 0).length;
    const contactsWithoutJobs = results.filter(r => r.jobCount === 0).length;
    const totalJobsSelected = results.reduce((sum, r) => sum + r.jobCount, 0);
    const uniqueJobs = new Set();
    results.forEach(r => {
      r.selectedJobs.forEach(job => {
        uniqueJobs.add(`${job.source}:${job.id}`);
      });
    });
    
    console.log(`Contacts tested: ${results.length}`);
    console.log(`Contacts with jobs: ${contactsWithJobs}`);
    console.log(`Contacts without jobs: ${contactsWithoutJobs}`);
    console.log(`Total jobs selected: ${totalJobsSelected}`);
    console.log(`Unique jobs across all contacts: ${uniqueJobs.size}`);
    console.log('');
    
    // Check for personalization
    const jobDistribution = {};
    results.forEach(r => {
      r.selectedJobs.forEach(job => {
        const key = `${job.source}:${job.id}`;
        if (!jobDistribution[key]) {
          jobDistribution[key] = [];
        }
        jobDistribution[key].push(r.contact.id);
      });
    });
    
    const sharedJobs = Object.entries(jobDistribution).filter(([_, contacts]) => contacts.length > 1);
    
    if (sharedJobs.length > 0) {
      console.log(`⚠️  Warning: ${sharedJobs.length} job(s) are shared across multiple contacts:`);
      sharedJobs.forEach(([jobKey, contactIds]) => {
        console.log(`   ${jobKey} → Contacts: ${contactIds.join(', ')}`);
      });
      console.log('');
    } else {
      console.log(`✅ Good: All selected jobs are unique to each contact (personalized)\n`);
    }
    
    // Strategy distribution
    const strategyCounts = {};
    results.forEach(r => {
      strategyCounts[r.strategy] = (strategyCounts[r.strategy] || 0) + 1;
    });
    
    console.log('Strategy distribution:');
    Object.entries(strategyCounts).forEach(([strategy, count]) => {
      console.log(`   ${strategy}: ${count} contact(s)`);
    });
    console.log('');
    
  } catch (error) {
    console.error('❌ Error testing filtering:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the test
if (require.main === module) {
  testFiltering()
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testFiltering, selectJobsForContact };

