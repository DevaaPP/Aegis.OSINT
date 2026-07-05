import * as crypto from 'crypto';

export interface BreachInfo {
  name: string;
  domain: string;
  breachDate: string;
  severity: 'HIGH' | 'CRITICAL' | 'MEDIUM';
  exposedData: string[];
  description: string;
  remediation: string;
}

const HISTORICAL_BREACHES: BreachInfo[] = [
  {
    name: 'Canva Hack',
    domain: 'canva.com',
    breachDate: '2019-05-24',
    severity: 'HIGH',
    exposedData: ['Passwords (bcrypt)', 'Email Addresses', 'Usernames', 'Names'],
    description: 'In May 2019, Canva suffered a data breach exposing the personal files of 137 million users, including password hashes, names, and emails.',
    remediation: 'Change your password immediately on Canva and any other sites where you reused the same password. Enable Multi-Factor Authentication.'
  },
  {
    name: 'LinkedIn Scraping',
    domain: 'linkedin.com',
    breachDate: '2021-04-06',
    severity: 'MEDIUM',
    exposedData: ['Full Names', 'Email Addresses', 'Phone Numbers', 'Job Titles', 'Social Profiles'],
    description: 'A database containing scraped public profiles of 500 million LinkedIn users was posted for sale on a hacker forum.',
    remediation: 'Be alert for highly targeted phishing emails and SMS scams. Update your LinkedIn privacy settings to hide your email and connection list.'
  },
  {
    name: 'Truecaller Database Leak',
    domain: 'truecaller.com',
    breachDate: '2019-05-18',
    severity: 'CRITICAL',
    exposedData: ['Phone Numbers', 'Full Names', 'Email Addresses', 'Network Carriers'],
    description: 'A massive registry containing 140 million Truecaller records, primarily belonging to Indian users, was leaked and traded on darknet forums.',
    remediation: 'Go to truecaller.com/unlisting to remove your number. Beware of incoming bank fraud calls claiming to verify your identity using your name.'
  },
  {
    name: 'Air India Passenger Leak',
    domain: 'airindia.in',
    breachDate: '2021-02-20',
    severity: 'CRITICAL',
    exposedData: ['Passport Numbers', 'Names', 'Credit Cards (no CVV/PIN)', 'Ticket details'],
    description: 'Air India passenger system provider SITA suffered a cyberattack, exposing data for 4.5 million flyers registered over a 10-year span.',
    remediation: 'If your card was registered, replace it immediately. Monitor your bank statements for unauthorized charges.'
  },
  {
    name: 'Adobe Leak',
    domain: 'adobe.com',
    breachDate: '2013-10-04',
    severity: 'HIGH',
    exposedData: ['Passwords (encrypted 3DES)', 'Email Addresses', 'Password Hints'],
    description: 'Adobe systems were compromised exposing 152 million accounts, containing usernames, emails, and weak cryptographically encrypted passwords.',
    remediation: 'Adobe has reset all passwords, but if you used the same password elsewhere, update it. Make sure password hints do not give away secret answers.'
  },
  {
    name: 'Dropbox Security Breach',
    domain: 'dropbox.com',
    breachDate: '2012-07-20',
    severity: 'HIGH',
    exposedData: ['Email Addresses', 'Passwords (bcrypt)'],
    description: 'In 2012, Dropbox suffered a breach affecting 68 million users. The email address list was used to target spam and verify password reused accounts.',
    remediation: 'Change your Dropbox password if you have not done so since 2016. Check if your current password complies with length standards.'
  }
];

export async function lookupBreaches(target: string): Promise<BreachInfo[]> {
  const normalizedTarget = target.trim().toLowerCase();

  // Preset mock accounts
  if (normalizedTarget === 'admin@privacy.org') {
    return []; // Admin account is clean
  }

  if (normalizedTarget === 'user@privacy.org') {
    // Return a default breach for demonstration
    return [HISTORICAL_BREACHES[0], HISTORICAL_BREACHES[1]];
  }

  // If the target is a phone number, return breaches that specifically leak phone numbers
  const isPhone = /^[+\d\s-]{7,15}$/.test(normalizedTarget.replace(/[^\d]/g, ''));
  if (isPhone) {
    return [HISTORICAL_BREACHES[1], HISTORICAL_BREACHES[2]]; // LinkedIn and Truecaller leaks
  }

  // Deterministic mapping: select breaches based on email hash so any search receives consistent results
  const hash = crypto.createHash('sha256').update(normalizedTarget).digest('hex');
  const count = (parseInt(hash.substring(0, 2), 16) % 3) + 1; // 1 to 3 breaches
  
  const selectedBreaches: BreachInfo[] = [];
  const indices = new Set<number>();
  
  for (let i = 0; i < count; i++) {
    const start = i * 4;
    const index = parseInt(hash.substring(start, start + 4), 16) % HISTORICAL_BREACHES.length;
    if (!indices.has(index)) {
      indices.add(index);
      selectedBreaches.push(HISTORICAL_BREACHES[index]);
    }
  }

  return selectedBreaches;
}
