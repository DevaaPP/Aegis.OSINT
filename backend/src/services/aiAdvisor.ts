import { CONFIG } from '../config';

export interface AdviceItem {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  action: string;
  remediationSteps: string[];
}

export async function generatePrivacyAdvice(
  findings: { category: string; severity: string; title: string; description: string }[]
): Promise<string> {
  const apiKey = CONFIG.GEMINI_API_KEY;

  // 1. If Gemini API Key is provided, query Google Gemini for customized advice
  if (apiKey) {
    try {
      // Dynamic import to prevent import errors if SDK fails to load
      const { GoogleGenAI } = require('@google/generative-ai');
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
        You are Antigravity, an expert cybersecurity and privacy advisor agent.
        Below are the digital footprint exposure findings for a user. Review them and generate a professional, conversational, and highly actionable remediation guide. List step-by-step instructions on how the user can opt-out, delete, or clean up their exposed details.

        Findings:
        ${JSON.stringify(findings, null, 2)}

        Format the response in beautiful Markdown, starting directly with an Executive Summary, followed by prioritized action items (High, Medium, Low), and specific instructions.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err: any) {
      console.error('Error invoking Google Gemini API:', err.message || err);
      // Fallback to local expert rules on API failure
    }
  }

  // 2. Local Expert System Rule-Engine (Offline fallback)
  return compileLocalExpertSystemAdvice(findings);
}

function compileLocalExpertSystemAdvice(
  findings: { category: string; severity: string; title: string; description: string }[]
): string {
  const advices: AdviceItem[] = [];

  const categories = new Set(findings.map(f => f.category));

  if (categories.has('Username Found') || categories.has('Profile Found')) {
    advices.push({
      priority: 'MEDIUM',
      title: 'De-link Unused Social Accounts',
      action: 'You have active profiles sharing the same username across multiple platforms. This enables cross-platform tracking.',
      remediationSteps: [
        'Delete old, unused forums or blogging profiles (e.g., Medium, Tumblr).',
        'If you want to keep the profiles active, change the username on anonymous accounts so they do not link to your real identity.',
        'Use services like JustDelete.me to locate direct deletion links for specific services.'
      ]
    });
  }

  if (categories.has('Data Breach') || categories.has('Breach Match')) {
    advices.push({
      priority: 'HIGH',
      title: 'Remediate Leaked Credentials',
      action: 'Your email address appeared in historical databases exposing encrypted passwords or cleartext credentials.',
      remediationSteps: [
        'Change passwords immediately on breached services (like Canva or Adobe).',
        'Ensure you do not reuse the leaked password on any active account (e.g., bank, primary email).',
        'Enable Multi-Factor Authentication (MFA) on all profiles that support it.'
      ]
    });
  }

  if (categories.has('GPS Exposed') || categories.has('EXIF GPS')) {
    advices.push({
      priority: 'HIGH',
      title: 'Strip Geolocation tags from Photos',
      action: 'EXIF metadata tags containing GPS coordinates were detected in uploaded image files, exposing physical locations.',
      remediationSteps: [
        'Use our Metadata Stripper tool to clean all coordinates before uploading resumes or avatars.',
        'Disable location services for the Camera app on your smartphone settings.',
        'Wipe existing local photos using Windows file details properties or Exiftool in your command line.'
      ]
    });
  }

  if (categories.has('Truecaller Leak') || findings.some(f => f.description.toLowerCase().includes('truecaller'))) {
    advices.push({
      priority: 'HIGH',
      title: 'Unlist Number from Truecaller',
      action: 'Your phone number and name are exposed on public directories like Truecaller.',
      remediationSteps: [
        'Visit the unlisting portal at truecaller.com/unlisting.',
        'Enter your phone number with your country code (+91 for India).',
        'Submit the verification captcha to unlist within 24 hours.'
      ]
    });
  }

  if (categories.has('Google Calendar Exposed') || findings.some(f => f.title.toLowerCase().includes('calendar'))) {
    advices.push({
      priority: 'MEDIUM',
      title: 'Secure Google Calendar Permissions',
      action: 'Your Google Calendar is set to public, allowing anyone to view future schedules.',
      remediationSteps: [
        'Open Google Calendar on your browser.',
        'Go to Settings -> Settings for my calendars -> Access permissions for events.',
        'Uncheck "Make available to public" to hide your schedule.'
      ]
    });
  }

  // Compile advices into Markdown string
  let markdown = `# AI Privacy Advisor Playbook\n\n`;
  markdown += `### Executive Summary\n`;
  markdown += `Based on our recursive footprint scan, we identified several vulnerability points. Below is your step-by-step remediation guide.\n\n`;

  const high = advices.filter(a => a.priority === 'HIGH');
  const medium = advices.filter(a => a.priority === 'MEDIUM');
  const low = advices.filter(a => a.priority === 'LOW');

  const printSection = (title: string, list: AdviceItem[]) => {
    if (list.length === 0) return '';
    let section = `## 🔴 ${title} Priority Actions\n\n`;
    list.forEach(a => {
      section += `### ${a.title}\n`;
      section += `* **Finding**: ${a.action}\n`;
      section += `* **Remediation Steps**:\n`;
      a.remediationSteps.forEach(step => {
        section += `  1. ${step}\n`;
      });
      section += `\n`;
    });
    return section;
  };

  markdown += printSection('High', high);
  markdown += printSection('Medium', medium);
  markdown += printSection('Low', low);

  if (advices.length === 0) {
    markdown += `### 🎉 Good News!\nNo high-exposure privacy risks were found during this scan. Continue monitoring your accounts and clean file metadata before sharing.\n`;
  }

  return markdown;
}
