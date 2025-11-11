# Dynamic Jobs Setup

## Problem Solved
The website was showing 6 static jobs that were hardcoded in the seed data. These jobs couldn't be managed through the "Manage Jobs" page because they weren't associated with any employer user.

## Solution
Converted the static jobs to dynamic jobs by:
1. **Removed static jobs** from `seed/jobs.json`
2. **Created a script** to post the same 6 jobs dynamically through the API
3. **Associated jobs with existing employers** so they appear in "Manage Jobs"

## How to Run

### Prerequisites
1. Make sure your backend server is running (`npm start` or `npm run dev`)
2. Make sure the database is seeded with users (employers exist)

### Run the Script
```bash
# From the mycareerbuild-backend directory
node run-dynamic-jobs.js
```

## What Happens
The script will:
1. **Login as each employer** using their credentials
2. **Post the 6 jobs** through the API (same data as before)
3. **Associate jobs with employers**:
   - **TechCorp Solutions** (hr@techcorp.com): Senior Frontend Developer, UI/UX Designer, Data Scientist
   - **InnovateTech** (recruiter@innovate.com): Full Stack Developer, DevOps Engineer, Product Manager

## Result
- ✅ **6 jobs will be created dynamically**
- ✅ **Jobs will appear in "Manage Jobs" page** for their respective employers
- ✅ **Jobs will be visible on the main jobs page**
- ✅ **Employers can edit/delete these jobs** through the UI
- ✅ **No more static/hardcoded jobs**

## Employer Credentials
- **TechCorp Solutions**: hr@techcorp.com / password123
- **InnovateTech**: recruiter@innovate.com / password123

## Jobs Created
1. Senior Frontend Developer (TechCorp Solutions)
2. Full Stack Developer (InnovateTech)
3. UI/UX Designer (TechCorp Solutions)
4. DevOps Engineer (InnovateTech)
5. Data Scientist (TechCorp Solutions)
6. Product Manager (InnovateTech)

## Verification
After running the script:
1. Check the main jobs page - you should see 6 jobs
2. Login as hr@techcorp.com and go to "Manage Jobs" - you should see 3 jobs
3. Login as recruiter@innovate.com and go to "Manage Jobs" - you should see 3 jobs
4. All jobs should be editable and manageable through the UI
