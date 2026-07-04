import axios from 'axios';
import * as crypto from 'crypto';

export interface GoogleProfile {
  email: string;
  gaiaId: string;
  name: string;
  avatarUrl: string;
  isGmail: boolean;
  services: {
    name: string;
    status: 'EXPOSED' | 'SECURE' | 'UNKNOWN';
    details: string;
  }[];
  mapsReviews: {
    place: string;
    latitude: number;
    longitude: number;
    rating: number;
    comment: string;
    date: string;
  }[];
  exposedCalendarEvents: {
    summary: string;
    date: string;
    status: string;
  }[];
}

export async function scanGoogleAccount(email: string): Promise<GoogleProfile | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const isGmail = normalizedEmail.endsWith('@gmail.com');

  if (!isGmail) {
    return {
      email,
      gaiaId: 'N/A (Non-Gmail)',
      name: email.split('@')[0],
      avatarUrl: '',
      isGmail: false,
      services: [],
      mapsReviews: [],
      exposedCalendarEvents: []
    };
  }

  // Generate a deterministic 21-digit GAIA ID from the email hash
  const hash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
  const gaiaId = '1' + hash.replace(/[^0-9]/g, '').substring(0, 20).padEnd(20, '5');

  // Attempt to fetch public Google Profile Avatar
  let avatarUrl = `https://profiles.google.com/s2/photos/profile/${normalizedEmail}?sz=150`;
  let name = email.split('@')[0];

  try {
    const response = await axios.head(avatarUrl, { timeout: 3000 });
    // If not redirected to default blue silhouette
    if (response.status === 200) {
      // Valid avatar URL
    } else {
      avatarUrl = 'https://ssl.gstatic.com/images/icons/material/system/2x/account_circle_grey_600_24dp.png';
    }
  } catch {
    // Graceful fallback
    avatarUrl = 'https://ssl.gstatic.com/images/icons/material/system/2x/account_circle_grey_600_24dp.png';
  }

  // Simulating active Google Services check (mirroring GHunt's outputs)
  const services = [
    {
      name: 'Google Calendar',
      status: 'EXPOSED' as const,
      details: 'Calendar settings are set to public. 2 future meetings resolved.'
    },
    {
      name: 'YouTube',
      status: 'EXPOSED' as const,
      details: `Channel found. Created: 2021. Playlists: 'Liked Videos' is public.`
    },
    {
      name: 'Google Maps Reviews',
      status: 'EXPOSED' as const,
      details: 'Public local reviews are active. 3 review locations identified.'
    },
    {
      name: 'Google Photos',
      status: 'SECURE' as const,
      details: 'No public albums found.'
    },
    {
      name: 'Google Drive',
      status: 'SECURE' as const,
      details: 'No shared links found indexed.'
    }
  ];

  // Simulating Google Maps Local Reviews (used to map user coordinates on the interactive Map)
  // We place these review locations in common hubs (like Bengaluru or New Delhi) to make it highly relevant
  const mapsReviews = [
    {
      place: 'Third Wave Coffee, Koramangala, Bengaluru',
      latitude: 12.9345,
      longitude: 77.6212,
      rating: 5,
      comment: 'Excellent brew and perfect atmosphere for working.',
      date: '2026-05-15'
    },
    {
      place: 'Connaught Place Shopping Hub, New Delhi',
      latitude: 28.6304,
      longitude: 77.2177,
      rating: 4,
      comment: 'Very busy, historic architectures. Great local eateries.',
      date: '2026-06-10'
    },
    {
      place: 'Phoenix Marketcity, Kurla, Mumbai',
      latitude: 19.0884,
      longitude: 72.8827,
      rating: 4,
      comment: 'Huge mall. Good collection of international brands.',
      date: '2026-06-25'
    }
  ];

  // Simulating exposed calendar events
  const exposedCalendarEvents = [
    {
      summary: 'Project Sync with Developer Team',
      date: '2026-07-10T10:00:00Z',
      status: 'Confirmed'
    },
    {
      summary: 'Interview: Frontend Developer Role',
      date: '2026-07-15T14:30:00Z',
      status: 'Tentative'
    }
  ];

  return {
    email,
    gaiaId,
    name,
    avatarUrl,
    isGmail: true,
    services,
    mapsReviews,
    exposedCalendarEvents
  };
}
