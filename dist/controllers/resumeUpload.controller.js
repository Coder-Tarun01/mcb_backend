"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAndParseResume = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const Resume_1 = require("../models/Resume");
// Configure multer for file uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
        }
    }
});
exports.uploadMiddleware = upload.single('resume');
/**
 * Upload and parse resume file
 */
const uploadAndParseResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        // For now, we'll simulate parsing the resume
        // In a real implementation, you would use a service like:
        // - AWS Textract for PDF parsing
        // - Microsoft Graph API for Word documents
        // - Or a third-party service like Affinda, Resume.io, etc.
        const parsedData = await parseResumeFile(req.file);
        // Get or create user's primary resume
        let resume = await Resume_1.Resume.findOne({
            where: { userId: userId, isPrimary: true }
        });
        if (!resume) {
            resume = await Resume_1.Resume.create({
                id: require('crypto').randomUUID(),
                userId: userId,
                title: 'My Resume',
                isPrimary: true,
                isPublic: false,
                status: 'draft',
                personalInfo: {
                    fullName: '',
                    email: '',
                    phone: '',
                    address: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: '',
                    linkedin: '',
                    website: '',
                    summary: '',
                    headline: ''
                },
                workExperience: [],
                education: [],
                skills: [],
                projects: [],
                certifications: [],
                languages: [],
                references: [],
                additionalInfo: {
                    interests: [],
                    volunteerWork: [],
                    publications: [],
                    awards: []
                },
                settings: {
                    template: 'modern',
                    colorScheme: 'blue',
                    fontFamily: 'Arial',
                    fontSize: 12,
                    margins: { top: 20, bottom: 20, left: 20, right: 20 },
                    sections: {
                        personalInfo: true,
                        summary: true,
                        workExperience: true,
                        education: true,
                        skills: true,
                        projects: true,
                        certifications: true,
                        languages: true,
                        references: true,
                        additionalInfo: true
                    },
                    sectionOrder: ['personalInfo', 'summary', 'workExperience', 'education', 'skills', 'projects', 'certifications', 'languages', 'references', 'additionalInfo']
                }
            });
        }
        // Update resume with parsed data
        if (parsedData.personalInfo) {
            resume.personalInfo = { ...resume.personalInfo, ...parsedData.personalInfo };
        }
        if (parsedData.summary) {
            resume.personalInfo = { ...resume.personalInfo, summary: parsedData.summary };
        }
        if (parsedData.skills) {
            resume.skills = Array.isArray(parsedData.skills) ? parsedData.skills : [];
        }
        if (parsedData.workExperience) {
            resume.workExperience = Array.isArray(parsedData.workExperience) ? parsedData.workExperience : [];
        }
        if (parsedData.education) {
            resume.education = Array.isArray(parsedData.education) ? parsedData.education : [];
        }
        if (parsedData.projects) {
            resume.projects = Array.isArray(parsedData.projects) ? parsedData.projects : [];
        }
        if (parsedData.accomplishments) {
            resume.certifications = Array.isArray(parsedData.accomplishments) ? parsedData.accomplishments : [];
        }
        await resume.save();
        res.json({
            success: true,
            message: 'Resume uploaded and parsed successfully',
            parsedData
        });
    }
    catch (error) {
        console.error('Error uploading resume:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process resume file',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.uploadAndParseResume = uploadAndParseResume;
/**
 * Simulate resume parsing (replace with actual parsing logic)
 */
async function parseResumeFile(file) {
    // This is a mock implementation
    // In a real application, you would:
    // 1. Extract text from PDF using pdf-parse or similar
    // 2. Parse Word documents using mammoth or similar
    // 3. Use NLP/AI services to extract structured data
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                personalInfo: {
                    name: 'John Doe',
                    email: 'john.doe@email.com',
                    phone: '+1 (555) 123-4567',
                    location: 'New York, NY',
                    linkedin: 'https://linkedin.com/in/johndoe',
                    headline: 'Senior Software Engineer with 5+ years of experience'
                },
                summary: 'Experienced software engineer with expertise in full-stack development, cloud technologies, and team leadership. Passionate about building scalable applications and mentoring junior developers.',
                skills: [
                    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes'
                ],
                workExperience: [
                    {
                        company: 'Tech Corp',
                        position: 'Senior Software Engineer',
                        startDate: '2020-01-01',
                        endDate: '2023-12-31',
                        isCurrent: false,
                        description: 'Led development of microservices architecture and mentored junior developers.'
                    },
                    {
                        company: 'StartupXYZ',
                        position: 'Software Engineer',
                        startDate: '2018-06-01',
                        endDate: '2019-12-31',
                        isCurrent: false,
                        description: 'Developed full-stack web applications using React and Node.js.'
                    }
                ],
                education: [
                    {
                        institution: 'University of Technology',
                        degree: 'Bachelor of Science',
                        field: 'Computer Science',
                        startDate: '2014-09-01',
                        endDate: '2018-05-31',
                        isCurrent: false,
                        gpa: '3.8'
                    }
                ],
                projects: [
                    {
                        title: 'E-commerce Platform',
                        description: 'Built a full-stack e-commerce platform with React and Node.js',
                        technologies: ['React', 'Node.js', 'MongoDB', 'Stripe'],
                        startDate: '2022-01-01',
                        endDate: '2022-06-30',
                        isCurrent: false,
                        role: 'Lead Developer'
                    }
                ],
                accomplishments: [
                    {
                        title: 'AWS Certified Solutions Architect',
                        type: 'Certification',
                        issuer: 'Amazon Web Services',
                        date: '2022-03-15',
                        description: 'Professional certification in cloud architecture'
                    }
                ],
                desiredCareer: {
                    jobType: 'Senior Software Engineer',
                    preferredLocation: 'Remote',
                    noticePeriod: '2 weeks',
                    expectedSalary: '120000',
                    currency: 'USD',
                    workType: 'full-time'
                }
            });
        }, 2000); // Simulate processing time
    });
}
//# sourceMappingURL=resumeUpload.controller.js.map