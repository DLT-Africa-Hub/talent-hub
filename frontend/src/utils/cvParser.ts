import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure pdfjs worker - use unpkg.com which is more reliable
if (typeof window !== 'undefined') {
    // Use unpkg.com which properly serves the worker file with correct MIME type and CORS headers
    // Fallback to jsdelivr if unpkg fails
    const version = pdfjsLib.version;
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

    // If unpkg fails, try jsdelivr as fallback
    // Note: We'll handle errors in the extraction function
}

export interface ParsedCVData {
    firstName?: string;
    lastName?: string;
    phoneNo?: string;
    email?: string;
    skills?: string[];
    summary?: string;
    yearsOfExperience?: string;
    roles?: string[];
    rank?: string;
}

/**
 * Extract text from PDF file
 */
async function extractTextFromPDF(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();

        // Try to load PDF with error handling for worker issues
        let pdf;
        try {
            pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        } catch (workerError: unknown) {
            // If worker fails, try switching to jsdelivr CDN
            const errorMessage = workerError instanceof Error ? workerError.message : String(workerError);
            if (errorMessage.includes('worker') || errorMessage.includes('Setting up fake worker')) {
                console.warn('Primary worker failed, trying jsdelivr CDN...');
                const version = pdfjsLib.version;
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
                pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            } else {
                throw workerError;
            }
        }

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item) => {
                    // Type guard for text content items
                    if ('str' in item && typeof item.str === 'string') {
                        return item.str;
                    }
                    return '';
                })
                .join(' ');
            fullText += pageText + '\n';
        }

        return fullText;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF. Please ensure your PDF is not password-protected and is a valid PDF file.');
    }
}

/**
 * Extract text from DOCX file
 */
async function extractTextFromDOCX(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (error) {
        console.error('Error extracting text from DOCX:', error);
        throw new Error('Failed to extract text from DOCX');
    }
}

/**
 * Extract text from a CV file (PDF or DOCX)
 */
async function extractTextFromCV(file: File): Promise<string> {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return extractTextFromPDF(file);
    } else if (
        fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileType === 'application/msword' ||
        fileName.endsWith('.docx') ||
        fileName.endsWith('.doc')
    ) {
        return extractTextFromDOCX(file);
    } else {
        throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
    }
}

/**
 * Extract name from text (first line or common patterns)
 */
function extractName(text: string): { firstName?: string; lastName?: string } {
    const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

    if (lines.length === 0) return {};

    // Get the first line which typically contains the name
    const firstLine = lines[0];

    // Remove common titles, locations, and suffixes that might appear after the name
    // Titles: Software Engineer, Developer, etc.
    // Locations: Lagos, Nigeria, etc.
    // Common patterns: "John Doe Software Engineer" -> "John Doe"
    //                  "John Doe Lagos, Nigeria" -> "John Doe"
    const stopPatterns = [
        /\s+(Software\s+Engineer|Developer|Engineer|Designer|Manager|Lead|Architect|Consultant|Specialist|Analyst|Programmer)/i,
        /\s+(Full\s*Stack|Fullstack|Front\s*End|Frontend|Back\s*End|Backend|DevOps|SRE|QA)/i,
        /\s+(Lagos|Nigeria|Abuja|Kano|Ibadan|Port\s+Harcourt|United\s+States|USA|UK|United\s+Kingdom)/i,
        /\s*[,-]\s*[A-Z]/, // Comma or dash followed by capital (likely location or title start)
    ];

    let cleanedFirstLine = firstLine;
    for (const pattern of stopPatterns) {
        const match = cleanedFirstLine.match(pattern);
        if (match && match.index !== undefined) {
            // Only remove if it's after what looks like a name (at least 2 words)
            const beforeTitle = cleanedFirstLine.substring(0, match.index).trim();
            const wordsBeforeTitle = beforeTitle.split(/\s+/).filter(w => w.length > 0);
            if (wordsBeforeTitle.length >= 2) {
                cleanedFirstLine = beforeTitle;
                break;
            }
        }
    }

    // Try "Last, First" format first
    const commaPattern = /^([A-Z][A-Za-z]+),\s*([A-Z][A-Za-z]+(?:\s+[A-Z][a-z]*)?)/;
    const commaMatch = cleanedFirstLine.match(commaPattern);

    if (commaMatch && commaMatch[1] && commaMatch[2]) {
        return {
            firstName: commaMatch[2].trim(),
            lastName: commaMatch[1].trim(),
        };
    }

    // Try patterns for "First Last" - match exactly 2 capitalized words
    // This ensures we only get the name, not titles or locations
    const namePattern = /^([A-Z][A-Za-z]+)\s+([A-Z][A-Za-z]+)(?:\s|$)/;
    const match = cleanedFirstLine.match(namePattern);

    if (match && match[1] && match[2]) {
        return {
            firstName: match[1].trim(),
            lastName: match[2].trim(),
        };
    }

    // Fallback: split first line by spaces, take ONLY first 2 capitalized words
    const words = cleanedFirstLine.split(/\s+/).filter(w => w.length > 0 && /^[A-Z]/.test(w));
    if (words.length >= 2) {
        // Only take the first 2 capitalized words as name - stop here!
        return {
            firstName: words[0],
            lastName: words[1], // Just the second word, not all remaining words
        };
    }

    return {};
}

/**
 * Extract phone number from text
 */
function extractPhone(text: string): string | undefined {
    // Common phone patterns
    const phonePatterns = [
        /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
        /(\+?\d{1,4}[-.\s]?)?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
    ];

    for (const pattern of phonePatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
            // Return the first valid phone number, cleaned up
            const phone = matches[0].replace(/[-.\s()]/g, '');
            if (phone.length >= 10) {
                return phone;
            }
        }
    }

    return undefined;
}

/**
 * Extract email from text
 */
function extractEmail(text: string): string | undefined {
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailPattern);
    return matches && matches.length > 0 ? matches[0] : undefined;
}

/**
 * Extract skills from text (common tech skills)
 */
function extractSkills(text: string): string[] {
    const commonSkills = [
        'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Python',
        'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
        'HTML', 'CSS', 'SASS', 'SCSS', 'Tailwind', 'Bootstrap',
        'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Firebase',
        'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'CI/CD',
        'Express', 'Django', 'Flask', 'Spring', 'Laravel',
        'GraphQL', 'REST API', 'Microservices', 'Agile', 'Scrum',
        'Machine Learning', 'Data Science', 'AI', 'TensorFlow', 'PyTorch',
        'DevOps', 'Linux', 'Unix', 'Windows', 'MacOS',
        'Frontend', 'Backend', 'Full Stack', 'Mobile Development',
        'iOS', 'Android', 'React Native', 'Flutter',
    ];

    const textLower = text.toLowerCase();
    const foundSkills: string[] = [];

    for (const skill of commonSkills) {
        const skillLower = skill.toLowerCase();
        // Check for exact word match or common variations
        const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(textLower)) {
            foundSkills.push(skill);
        }
    }

    return [...new Set(foundSkills)]; // Remove duplicates
}

/**
 * Extract years of experience from text
 */
function extractYearsOfExperience(text: string): string | undefined {
    const patterns = [
        /(\d+)\+?\s*years?\s*(?:of\s*)?experience/gi,
        /(\d+)\+?\s*yrs?\s*(?:of\s*)?exp/gi,
        /experience[:\s]+(\d+)\+?\s*years?/gi,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const years = parseInt(match[0].match(/\d+/)?.[0] || '0', 10);
            if (years > 0) {
                // Map to the format used in the Experience form component
                // Format: '3&minus;5 years', '5&minus;7 years', '7&minus;10 years', '10+ years'
                if (years < 3) return '3&minus;5 years'; // Minimum is 3 years
                if (years < 5) return '3&minus;5 years';
                if (years < 7) return '5&minus;7 years';
                if (years < 10) return '7&minus;10 years';
                return '10+ years';
            }
        }
    }

    return undefined;
}

/**
 * Extract roles/positions from text
 */
function extractRoles(text: string): string[] {
    const roleKeywords: Record<string, string> = {
        'frontend developer': 'frontend|react|vue|angular|javascript|typescript|html|css',
        'backend developer': 'backend|node|express|api|server|database|sql',
        'fullstack developer': 'fullstack|full stack|full-stack',
        'mobile developer': 'mobile|ios|android|react native|flutter|swift|kotlin',
        'devops engineer': 'devops|docker|kubernetes|ci/cd|aws|azure|gcp',
        'data engineer': 'data engineer|data science|machine learning|ml|ai|tensorflow|pytorch',
        'security engineer': 'security|cybersecurity|penetration|vulnerability',
    };

    const textLower = text.toLowerCase();
    const foundRoles: string[] = [];

    for (const [role, keywords] of Object.entries(roleKeywords)) {
        const keywordPattern = new RegExp(keywords, 'i');
        if (keywordPattern.test(textLower)) {
            foundRoles.push(role);
        }
    }

    return [...new Set(foundRoles)]; // Remove duplicates
}

/**
 * Extract experience level (rank) from text
 */
function extractExperienceLevel(text: string): string | undefined {
    const textLower = text.toLowerCase();

    // Check for senior level indicators
    if (
        /senior|sr\.|lead|principal|architect|manager|director/.test(textLower)
    ) {
        return 'senior level';
    }

    // Check for mid level indicators
    if (
        /mid|intermediate|experienced|professional/.test(textLower) &&
        !/senior|sr\.|lead|principal/.test(textLower)
    ) {
        return 'mid level';
    }

    // Check for entry level indicators
    if (
        /entry|junior|jr\.|graduate|intern|trainee|associate/.test(textLower) &&
        !/senior|mid|intermediate/.test(textLower)
    ) {
        return 'entry level';
    }

    // Try to infer from years of experience
    const yearsMatch = textLower.match(/(\d+)\+?\s*years?/);
    if (yearsMatch) {
        const years = parseInt(yearsMatch[1], 10);
        if (years >= 7) return 'senior level';
        if (years >= 4) return 'mid level';
        if (years >= 0) return 'entry level';
    }

    return undefined;
}

/**
 * Extract summary/objective from text (usually first paragraph or section)
 */
function extractSummary(text: string): string | undefined {
    const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

    // Look for common summary/objective headings (case-insensitive)
    // Headings are typically on their own line, often in ALL CAPS or Title Case
    const summaryHeadings = ['summary', 'overview', 'profile', 'objective', 'about', 'professional summary', 'career summary'];
    let summaryStartIndex = -1;

    for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const line = lines[i];
        const lineLower = line.toLowerCase();

        // Check if the line is a heading (matches a summary keyword exactly or starts with it)
        // Headings are often:
        // - In ALL CAPS: "SUMMARY"
        // - Title Case: "Summary"
        // - On their own line with minimal other text
        const isHeading = summaryHeadings.some(keyword => {
            // Exact match (case-insensitive)
            if (lineLower === keyword) return true;
            // Line starts with the keyword followed by colon or nothing
            if (lineLower.startsWith(keyword + ':') || lineLower.startsWith(keyword + ' ')) {
                // Check if it's mostly just the heading (not a full sentence)
                const afterKeyword = line.substring(keyword.length).trim();
                return afterKeyword.length < 20; // Heading with maybe a colon or short text
            }
            return false;
        });

        if (isHeading) {
            // Check if there's content on the same line after the heading
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0 && colonIndex < line.length - 10) {
                // Content on same line after colon
                const contentOnSameLine = line.substring(colonIndex + 1).trim();
                if (contentOnSameLine.length > 20) {
                    // Get content from same line and next few lines
                    const summaryParts = [contentOnSameLine];
                    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
                        if (lines[j].length > 10 && !/^[A-Z\s]+$/.test(lines[j])) {
                            // Not an all-caps heading
                            summaryParts.push(lines[j]);
                        } else {
                            break; // Hit another heading or empty line
                        }
                    }
                    const summary = summaryParts.join(' ').trim();
                    if (summary.length > 20 && summary.length < 1000) {
                        return summary;
                    }
                }
            }
            // Content starts on next line
            summaryStartIndex = i + 1;
            break;
        }
    }

    // If found a heading, get the content that follows
    if (summaryStartIndex >= 0 && summaryStartIndex < lines.length) {
        const summaryLines: string[] = [];

        // Collect lines until we hit another heading, empty line, or section break
        for (let i = summaryStartIndex; i < Math.min(lines.length, summaryStartIndex + 10); i++) {
            const line = lines[i];

            // Stop if we hit another major heading (all caps, or common section headers)
            if (/^(EXPERIENCE|EDUCATION|SKILLS|PROJECTS|CONTACT|WORK|CERTIFICATIONS)$/i.test(line)) {
                break;
            }

            // Stop if line is very short and looks like a section break
            if (line.length < 3) {
                if (summaryLines.length > 0) break; // Already have content, stop here
                continue; // Skip empty lines at start
            }

            // Stop if we hit another heading pattern
            if (/^[A-Z\s]{3,}$/.test(line) && line.length < 30) {
                // All caps short line, likely a heading
                if (summaryLines.length > 0) break;
                continue;
            }

            summaryLines.push(line);
        }

        if (summaryLines.length > 0) {
            const summary = summaryLines.join(' ').trim();
            // Clean up extra spaces and ensure reasonable length
            const cleanedSummary = summary.replace(/\s+/g, ' ');
            if (cleanedSummary.length > 20 && cleanedSummary.length < 1000) {
                return cleanedSummary;
            }
        }
    }

    // Fallback: use first substantial paragraph (if no heading found)
    for (const line of lines.slice(0, 10)) {
        // Skip if it looks like a heading or name
        if (/^[A-Z\s]{3,}$/.test(line) || line.length < 10) continue;

        if (line.length > 50 && line.length < 500) {
            return line;
        }
    }

    return undefined;
}

/**
 * Parse CV file and extract structured data
 */
export async function parseCV(file: File): Promise<ParsedCVData> {
    try {
        const text = await extractTextFromCV(file);
        const name = extractName(text);
        const phone = extractPhone(text);
        const email = extractEmail(text);
        const skills = extractSkills(text);
        const yearsOfExperience = extractYearsOfExperience(text);
        const summary = extractSummary(text);
        const roles = extractRoles(text);
        const rank = extractExperienceLevel(text);

        return {
            firstName: name.firstName,
            lastName: name.lastName,
            phoneNo: phone,
            email,
            skills: skills.length > 0 ? skills : undefined,
            yearsOfExperience,
            summary,
            roles: roles.length > 0 ? roles : undefined,
            rank,
        };
    } catch (error) {
        console.error('Error parsing CV:', error);
        throw error;
    }
}

