export const LATEST_VERSION = '2.5';

export const CHANGELOG = [
  {
    version: '2.5',
    date: 'May 2026',
    entries: [
      {
        tag: 'New Feature',
        title: 'Smart Lead Import',
        desc: 'Search Apollo (decision makers) and Google Maps (local businesses) at the same time. Results are automatically merged by company name — so you get the person\'s name and title from Apollo combined with the phone number from Google Maps in one lead.',
        bullets: [
          '📱 WhatsApp Mode — filters results to Malaysian mobile numbers (+601X) only',
          'Preview all leads before importing — pick exactly who you want',
          'Up to 1,000 leads per search with automatic pagination',
          'Create a new campaign inline without leaving the import screen',
          'Source badges show where each lead came from: Apollo, Maps, or Both ⚡',
        ],
      },
      {
        tag: 'Improvement',
        title: 'Lead Intelligence v2 — Bulk Actions',
        desc: 'Select any number of leads with checkboxes and act on all of them at once from a floating action bar.',
        bullets: [
          '⚡ Enrich with Apollo — fills missing email, phone, and job title for each lead',
          '📋 Assign to Campaign — move orphaned or un-assigned leads into any campaign',
          '🗑 Bulk delete — clean up your list in seconds',
          'New tab: "No Campaign" — shows all leads left behind when a campaign was deleted',
          'New tab: "📱 Has Mobile" — every lead with a WhatsApp-ready number',
        ],
      },
      {
        tag: 'Improvement',
        title: 'New Campaign — Seamless Import Flow',
        desc: 'Lead source selection is now 5 visual cards instead of plain radio buttons. If you pick Smart Import, Apollo, or Google Maps, the import screen opens automatically as soon as your campaign is created — no extra navigation needed.',
        bullets: [],
      },
    ],
  },
  {
    version: '2.4',
    date: 'April 2026',
    entries: [
      {
        tag: 'New Feature',
        title: 'Meetings & 5-Step Reminder Sequence',
        desc: 'Log every sales meeting from any lead profile. The system sends automatic WhatsApp and email reminders to the lead and your team at 5 checkpoints — dramatically reducing no-shows.',
        bullets: [
          'Booking confirmation sent the moment a meeting is logged',
          'Follow-up reminders at 24 hours, 3 hours, 1 hour, and 15 minutes before',
          'Reminders go to both the lead and your team simultaneously',
          'Log outcomes: Won, No-show, Cancelled, or Reschedule',
          'Upcoming meetings badge in the sidebar with live countdown',
        ],
      },
      {
        tag: 'New Feature',
        title: 'Weekly Client Reports — Auto Emails',
        desc: 'Every Monday at 8am, each of your clients receives a branded email report covering the previous week\'s activity for their campaigns.',
        bullets: [
          'Campaign stats: emails sent, open rate, replies, conversions',
          'Pipeline breakdown showing leads at each stage',
          'Meetings booked and outcomes for the week',
          'Toggle reports on/off per business in Settings → Notifications',
          'Send a preview anytime without waiting for Monday',
        ],
      },
      {
        tag: 'Improvement',
        title: 'Collapsible Sidebar',
        desc: 'Collapse both the main navigation and the Settings sidebar to icon-only mode for more screen space.',
        bullets: [
          'Hover over any icon to see the full label as a tooltip',
          'Badge dots replace number counters in collapsed mode',
          'Preference is saved and restored between sessions',
        ],
      },
      {
        tag: 'New Feature',
        title: 'Global Search — Cmd+K',
        desc: 'Press Cmd+K (or Ctrl+K on Windows) from anywhere in the app to instantly search your entire workspace.',
        bullets: [
          'Searches across businesses, campaigns, leads, and conversations',
          'Results grouped by category with keyboard navigation',
          'Press Enter or click to navigate directly to any result',
        ],
      },
    ],
  },
  {
    version: '2.3',
    date: 'March 2026',
    entries: [
      {
        tag: 'New Feature',
        title: 'AI Campaign Studio',
        desc: 'A dedicated workspace for building and managing all your outreach content in one place, separate from individual campaigns.',
        bullets: [
          '10 industry-specific email templates ready to use',
          'Pre-built sequences for common outreach goals',
          'Offer library for reusable value propositions',
          'Load any sequence or template directly into a campaign pipeline',
        ],
      },
      {
        tag: 'New Feature',
        title: 'Campaign & Channel Analytics',
        desc: 'Deep-dive performance data for every campaign and a side-by-side comparison of how each channel is performing.',
        bullets: [
          'Per-campaign: open rates, reply rates, meetings booked, revenue',
          'Channel comparison: Email vs WhatsApp vs Voice',
          'Revenue attribution — see which campaigns are actually generating deals',
        ],
      },
    ],
  },
  {
    version: '2.2',
    date: 'February 2026',
    entries: [
      {
        tag: 'Improvement',
        title: 'Settings V2 — Full Redesign',
        desc: 'Settings has been completely rebuilt with a proper left-nav sidebar so every configuration option is easy to find.',
        bullets: [
          'API Keys — Claude (Anthropic), SendGrid, WATI, Apollo all in one screen with live Test Connection buttons',
          'Integrations — connect Google Drive for automatic lead sheet creation',
          'Billing & Usage — real-time breakdown of API costs per channel',
          'Administration — add/remove team members, change roles, resend invites',
          'Notifications — configure WhatsApp and email alert preferences for your team',
          'Branding — customise how your workspace looks for clients',
        ],
      },
    ],
  },
  {
    version: '2.1',
    date: 'January 2026',
    entries: [
      {
        tag: 'New Feature',
        title: 'Unified Inbox & AI Auto-Reply',
        desc: 'All inbound WhatsApp and email replies flow into one Unified Inbox. The AI reads the full conversation thread before suggesting a reply — so it always sounds like it knows the context.',
        bullets: [
          'Thread view shows the complete conversation history per lead',
          'One-click AI suggested reply based on your persona and offer',
          'Take Over mode — AI handles replies automatically until you manually step in',
          'Inbound webhooks connected to SendGrid Inbound Parse and WATI',
          'Hot lead detection — automatically flags leads showing buying intent',
        ],
      },
      {
        tag: 'New Feature',
        title: 'Live Send Progress',
        desc: 'Watch your campaign execute in real time from the Campaign Dashboard.',
        bullets: [
          'Live counter for emails sent, WhatsApp messages delivered, calls made',
          'Per-lead status updates as the sequence runs',
          'Pause and resume a live campaign at any time',
        ],
      },
    ],
  },
  {
    version: '2.0',
    date: 'December 2025',
    entries: [
      {
        tag: 'New Feature',
        title: 'Revenue Engine — Full Rebuild',
        desc: 'The biggest update to KBOOS yet. The entire campaign system was rebuilt from scratch around a 7-stage pipeline that gives you full visibility and control over every outreach campaign.',
        bullets: [
          '7-stage Campaign Pipeline: Setup → Leads → Sequence → Personalise → Review → Launch → Analytics',
          '⚡ AI Fast Track — describe your goal in one prompt, Claude configures the full campaign strategy, channels, and sequence',
          '🔧 Quick Setup — manual control over every setting if you prefer to configure yourself',
          'Background worker queue (pg-boss) — sequences run reliably even if you close the browser',
          'Lead tier scoring — every lead is automatically scored and placed in Tier A, B, or C',
          'Per-campaign daily stats tracking open rates, replies, and conversions',
        ],
      },
    ],
  },
  {
    version: '1.2',
    date: 'November 2025',
    entries: [
      {
        tag: 'New Feature',
        title: 'Real-Time API Cost Tracking',
        desc: 'See exactly what every action costs across all your AI and messaging channels, with a monthly budget tracker.',
        bullets: [
          'Claude AI token costs per email, WhatsApp message, and voice script generated',
          'Real Vapi voice call duration and cost per call',
          'SendGrid email and WATI WhatsApp costs per message sent',
          'Monthly total with a per-channel breakdown in Settings → Billing',
        ],
      },
      {
        tag: 'New Feature',
        title: 'AI Smart Reply Engine',
        desc: 'Thread-aware AI that reads the full conversation before writing a reply. It matches the language, tone, and urgency of the prospect.',
        bullets: [
          'Reads all previous messages before generating a reply',
          'Persona-aware — knows your business name, offer, and style',
          'Goal-driven — always steers the conversation toward booking a meeting',
          'Handles English and Bahasa Malaysia automatically',
        ],
      },
    ],
  },
  {
    version: '1.1',
    date: 'October 2025',
    entries: [
      {
        tag: 'New Feature',
        title: 'Multi-Channel Outreach — Email, WhatsApp & Voice',
        desc: 'Real outreach connected to real APIs. Send emails, WhatsApp messages, and AI voice calls from inside KBOOS.',
        bullets: [
          'Email via SendGrid with personalised subject lines and body',
          'WhatsApp via WATI with template and free-text support',
          'Voice calls via Vapi with AI-generated call scripts',
          'Google Maps scraper (Outscraper) — import local businesses by keyword and city',
          'Apollo people search — find decision makers by job title and seniority',
          'Full automation: scrape → enrich → sequence → send, all in one pipeline',
        ],
      },
      {
        tag: 'New Feature',
        title: 'Prompt Templates',
        desc: 'Build a library of AI prompt templates for emails and WhatsApp. Track which templates get the best results.',
        bullets: [
          'Per-template open rate and reply rate statistics',
          'Test-send any template to yourself before going live',
          'Set an active template per business — the sequence engine uses it automatically',
        ],
      },
    ],
  },
  {
    version: '1.0',
    date: 'September 2025',
    entries: [
      {
        tag: 'New Feature',
        title: 'KBOOS Outreach OS — Launch 🚀',
        desc: 'The first version of KBOOS — a complete B2B outreach operating system purpose-built for Malaysian businesses. Everything you need to run professional outreach campaigns from one place.',
        bullets: [
          'Secure login with JWT authentication and role-based access control',
          'Business management — add businesses, generate AI outreach briefs with one click',
          'Team management — invite members, assign roles (Admin, Operator, Client)',
          'Client Portal — a read-only view your clients can log into to see their campaign progress',
          'Live Demo (/try) — self-serve demo that fires a real WhatsApp + email + AI voice call',
          'Client onboarding form — send a branded form to new clients to collect their info',
          'Deployed on Railway with PostgreSQL database',
        ],
      },
    ],
  },
];
