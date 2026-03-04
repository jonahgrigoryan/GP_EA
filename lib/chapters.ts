export interface ChapterSection {
  heading: string;
  body: string;
  type?: "tip" | "warning" | "steps";
}

export interface Chapter {
  id: number;
  title: string;
  description: string;
  readTime: string;
  icon: string;
  sections: ChapterSection[];
}

export const chapters: Chapter[] = [
  {
    id: 1,
    title: "Planning Your App",
    description: "Define scope, target audience, and MVP features before writing a single line of code.",
    readTime: "5 min",
    icon: "📋",
    sections: [
      {
        heading: "Define Your Target Audience",
        body: "Before building anything, identify who will use your app. Create user personas that describe their demographics, pain points, and goals. This clarity will guide every decision from feature prioritization to marketing strategy.",
      },
      {
        heading: "Scope Your MVP",
        body: "A Minimum Viable Product (MVP) is the simplest version of your app that delivers core value. List all features you want, then ruthlessly cut down to the essentials. Ship the MVP first, then iterate based on real user feedback.",
        type: "tip",
      },
      {
        heading: "Choose Your Tech Stack",
        body: "Select technologies based on your team's expertise, timeline, and requirements. React Native with Expo is excellent for cross-platform apps. Native development (Swift/Kotlin) offers maximum performance. Flutter provides a middle ground with a single codebase.",
      },
      {
        heading: "Set Up Project Management",
        body: "Use tools like Linear, Jira, or GitHub Projects to track tasks. Break your app into milestones with clear deliverables. Establish a regular cadence of sprints (1-2 weeks) to maintain momentum and accountability.",
      },
      {
        heading: "Key Planning Steps",
        body: "1. Write a one-page product brief\n2. Create wireframes for core screens\n3. Define your data model\n4. Estimate timeline and resources\n5. Set measurable success criteria",
        type: "steps",
      },
    ],
  },
  {
    id: 2,
    title: "Development Workflow",
    description: "Version control, branching strategies, and code review best practices.",
    readTime: "6 min",
    icon: "💻",
    sections: [
      {
        heading: "Git Branching Strategy",
        body: "Adopt a branching model like Git Flow or Trunk-Based Development. For most mobile apps, a simplified flow works well: main branch for production, develop branch for integration, and feature branches for individual work items.",
      },
      {
        heading: "Code Review Best Practices",
        body: "Every pull request should be reviewed by at least one other developer. Focus reviews on logic correctness, edge cases, and maintainability — not just style. Use automated linting to handle formatting so humans can focus on substance.",
        type: "tip",
      },
      {
        heading: "Environment Management",
        body: "Maintain separate environments for development, staging, and production. Use environment variables to manage API endpoints, feature flags, and secrets. Never hardcode sensitive values in your source code.",
        type: "warning",
      },
      {
        heading: "Development Setup Steps",
        body: "1. Initialize your repository with a README and .gitignore\n2. Configure ESLint and Prettier for consistent code style\n3. Set up pre-commit hooks with Husky\n4. Create a PR template with a checklist\n5. Document your development setup in the README",
        type: "steps",
      },
    ],
  },
  {
    id: 3,
    title: "Testing Strategies",
    description: "Unit tests, integration tests, and beta testing to ensure quality.",
    readTime: "7 min",
    icon: "🧪",
    sections: [
      {
        heading: "The Testing Pyramid",
        body: "Structure your tests as a pyramid: many unit tests at the base, fewer integration tests in the middle, and a small number of end-to-end tests at the top. This gives you fast feedback loops while still catching integration issues.",
      },
      {
        heading: "Unit Testing",
        body: "Test individual functions and components in isolation. Use Jest for JavaScript/TypeScript logic and React Native Testing Library for component behavior. Aim for high coverage on business logic, but don't chase 100% coverage blindly.",
      },
      {
        heading: "Integration & E2E Testing",
        body: "Integration tests verify that modules work together correctly. For mobile apps, tools like Detox or Maestro can automate UI flows. Run these tests on real devices or emulators to catch platform-specific issues.",
      },
      {
        heading: "Beta Testing",
        body: "Before public release, distribute your app to a small group of real users. Collect feedback on usability, performance, and bugs. Use TestFlight for iOS and Internal Testing tracks on Google Play for Android.",
        type: "tip",
      },
      {
        heading: "Testing Checklist",
        body: "1. Write unit tests for all utility functions\n2. Test navigation flows between screens\n3. Verify offline behavior and error states\n4. Test on multiple device sizes and OS versions\n5. Run a beta test with at least 10 real users",
        type: "steps",
      },
    ],
  },
  {
    id: 4,
    title: "App Store Preparation",
    description: "Screenshots, descriptions, metadata, and icons for store listings.",
    readTime: "6 min",
    icon: "🎨",
    sections: [
      {
        heading: "App Store Optimization (ASO)",
        body: "Your store listing is your app's storefront. Optimize your title, subtitle, and description with relevant keywords. Research what terms your target users search for and incorporate them naturally into your metadata.",
      },
      {
        heading: "Screenshots & Preview Videos",
        body: "Create compelling screenshots that showcase your app's key features. Use device frames, captions, and a consistent visual style. Apple requires screenshots for multiple device sizes. Consider adding a short preview video to boost conversion rates.",
      },
      {
        heading: "App Icon Design",
        body: "Your icon is the first thing users see. Keep it simple, recognizable, and unique. Avoid text in the icon — it becomes unreadable at small sizes. Test your icon against common wallpapers and alongside competitor apps.",
        type: "tip",
      },
      {
        heading: "Store Listing Preparation Steps",
        body: "1. Write a compelling app description (first 3 lines are crucial)\n2. Prepare screenshots for all required device sizes\n3. Design your app icon at 1024x1024px\n4. Write release notes for your first version\n5. Choose the correct app category and age rating",
        type: "steps",
      },
      {
        heading: "Privacy & Legal Requirements",
        body: "Both Apple and Google require a privacy policy URL. You must accurately declare what data your app collects and how it's used. Apple's App Tracking Transparency framework requires explicit user consent for tracking. Failing to comply can result in rejection.",
        type: "warning",
      },
    ],
  },
  {
    id: 5,
    title: "iOS App Store Submission",
    description: "Certificates, provisioning profiles, and App Store Connect walkthrough.",
    readTime: "8 min",
    icon: "🍎",
    sections: [
      {
        heading: "Apple Developer Account",
        body: "You need an Apple Developer Program membership ($99/year) to publish on the App Store. Enroll at developer.apple.com. Organization accounts require a D-U-N-S number, which can take a few days to obtain.",
      },
      {
        heading: "Certificates & Provisioning",
        body: "iOS apps require code signing certificates and provisioning profiles. Distribution certificates identify your team, while provisioning profiles link your app ID, certificate, and device list. Expo and EAS Build handle most of this automatically.",
        type: "tip",
      },
      {
        heading: "App Store Connect Setup",
        body: "Create your app in App Store Connect. Fill in all metadata: name, description, keywords, screenshots, and support URL. Configure pricing and availability. Set up your app's privacy details in the App Privacy section.",
      },
      {
        heading: "Submission Steps",
        body: "1. Build your app archive (IPA file) using Xcode or EAS Build\n2. Upload the build to App Store Connect via Transporter or EAS\n3. Fill in all required metadata and screenshots\n4. Submit for review with detailed review notes\n5. Respond promptly to any reviewer questions",
        type: "steps",
      },
      {
        heading: "Common Rejection Reasons",
        body: "Apps are frequently rejected for: crashes or bugs, incomplete information, placeholder content, privacy policy issues, and misleading descriptions. Test thoroughly and ensure all links and features work before submitting. Apple's review typically takes 24-48 hours.",
        type: "warning",
      },
    ],
  },
  {
    id: 6,
    title: "Google Play Submission",
    description: "App signing, Play Console setup, and release track management.",
    readTime: "7 min",
    icon: "🤖",
    sections: [
      {
        heading: "Google Play Developer Account",
        body: "Register for a Google Play Developer account with a one-time $25 fee. You'll need a Google account and must complete identity verification. Organization accounts require additional business documentation.",
      },
      {
        heading: "App Signing & Bundles",
        body: "Google Play uses App Signing by Google Play, where Google manages your signing key. Upload Android App Bundles (AAB) instead of APKs — they're smaller and Google optimizes delivery for each device configuration automatically.",
      },
      {
        heading: "Play Console Configuration",
        body: "Set up your store listing with a title, short description, full description, and graphics. Complete the content rating questionnaire, set up pricing, and configure your target audience and content declarations.",
      },
      {
        heading: "Release Tracks",
        body: "Google Play offers multiple release tracks: Internal testing (up to 100 testers, instant availability), Closed testing (limited group, review required), Open testing (anyone can join), and Production (public release). Use these progressively to catch issues early.",
        type: "tip",
      },
      {
        heading: "Submission Steps",
        body: "1. Create your app in Google Play Console\n2. Complete all store listing details and content rating\n3. Build and upload your AAB file\n4. Start with internal testing track\n5. Promote to production after successful testing",
        type: "steps",
      },
    ],
  },
  {
    id: 7,
    title: "CI/CD Pipelines",
    description: "Automated builds with EAS Build, Fastlane, and GitHub Actions.",
    readTime: "7 min",
    icon: "⚙️",
    sections: [
      {
        heading: "Why CI/CD Matters",
        body: "Continuous Integration and Continuous Delivery automate your build, test, and release process. This eliminates manual errors, speeds up releases, and gives your team confidence that every change is properly validated before reaching users.",
      },
      {
        heading: "EAS Build (Expo)",
        body: "If you're using Expo, EAS Build is the easiest path to CI/CD. It handles code signing, native builds, and submission to app stores. Configure your build profiles in eas.json and trigger builds from the command line or GitHub Actions.",
        type: "tip",
      },
      {
        heading: "Fastlane",
        body: "Fastlane automates tedious tasks like generating screenshots, managing certificates, and uploading builds. It works with both iOS and Android and integrates well with any CI service. Define your workflows in a Fastfile using Ruby DSL.",
      },
      {
        heading: "GitHub Actions Integration",
        body: "GitHub Actions provides free CI/CD minutes for open-source projects. Create workflows that run tests on every PR, build release candidates on merge to main, and automatically submit to app stores on tagged releases.",
      },
      {
        heading: "CI/CD Setup Steps",
        body: "1. Choose your CI/CD platform (EAS, GitHub Actions, etc.)\n2. Configure build profiles for development and production\n3. Set up automated testing in your pipeline\n4. Add code signing credentials as CI secrets\n5. Create a release workflow that builds and submits automatically",
        type: "steps",
      },
    ],
  },
  {
    id: 8,
    title: "Beta Distribution",
    description: "TestFlight, internal testing, and Firebase App Distribution.",
    readTime: "5 min",
    icon: "🚀",
    sections: [
      {
        heading: "Why Beta Test?",
        body: "Beta testing catches issues that automated tests miss: confusing UX, performance problems on specific devices, and unexpected user behaviors. It also builds early excitement and gives you valuable feedback before your public launch.",
      },
      {
        heading: "TestFlight (iOS)",
        body: "TestFlight is Apple's official beta testing platform. Internal testers (up to 100 team members) get builds instantly. External testers (up to 10,000) require a brief Apple review. Testers can provide feedback and crash reports directly through the TestFlight app.",
      },
      {
        heading: "Google Play Internal Testing",
        body: "Use Google Play's internal testing track for quick iteration with your team. Builds are available within minutes. Closed testing tracks let you expand to a larger group with a sign-up link. Both tracks provide crash reports and feedback.",
        type: "tip",
      },
      {
        heading: "Firebase App Distribution",
        body: "Firebase App Distribution works for both iOS and Android. It's especially useful for distributing builds outside of the official store channels. Testers receive email invitations and can install builds directly. Integrates well with CI/CD pipelines.",
      },
      {
        heading: "Beta Distribution Steps",
        body: "1. Build a release candidate with proper versioning\n2. Upload to your chosen distribution platform\n3. Invite testers with clear testing instructions\n4. Collect and triage feedback systematically\n5. Fix critical issues and ship an updated build",
        type: "steps",
      },
    ],
  },
  {
    id: 9,
    title: "Release Management",
    description: "Semantic versioning, staged rollouts, and hotfix strategies.",
    readTime: "6 min",
    icon: "📦",
    sections: [
      {
        heading: "Semantic Versioning",
        body: "Follow semantic versioning (MAJOR.MINOR.PATCH): increment MAJOR for breaking changes, MINOR for new features, and PATCH for bug fixes. Both iOS and Android also use a build number that must increment with each submission.",
      },
      {
        heading: "Staged Rollouts",
        body: "Don't release to 100% of users immediately. Google Play supports percentage-based staged rollouts (e.g., 5% → 20% → 50% → 100%). Monitor crash rates and user feedback at each stage before expanding. This limits the blast radius of any issues.",
        type: "tip",
      },
      {
        heading: "Over-the-Air Updates",
        body: "For React Native and Expo apps, EAS Update enables over-the-air (OTA) JavaScript updates without going through app store review. Use this for bug fixes and minor changes. Native code changes still require a full app store submission.",
      },
      {
        heading: "Hotfix Strategy",
        body: "When a critical bug reaches production, you need a fast response plan. Create a hotfix branch from the release tag, fix the issue, bump the patch version, and submit an expedited review. Apple offers expedited reviews for critical fixes.",
        type: "warning",
      },
      {
        heading: "Release Process Steps",
        body: "1. Freeze features and focus on bug fixes\n2. Update version number and changelog\n3. Run full regression test suite\n4. Deploy to staged rollout (start at 5-10%)\n5. Monitor metrics and expand rollout gradually",
        type: "steps",
      },
    ],
  },
  {
    id: 10,
    title: "Post-Launch Monitoring",
    description: "Crash reporting, analytics, and responding to user feedback.",
    readTime: "6 min",
    icon: "📊",
    sections: [
      {
        heading: "Crash Reporting",
        body: "Integrate a crash reporting tool like Sentry, Firebase Crashlytics, or Bugsnag from day one. These tools capture stack traces, device info, and reproduction steps automatically. Set up alerts for new crash types and spikes in crash rates.",
      },
      {
        heading: "Analytics & Metrics",
        body: "Track key metrics: Daily Active Users (DAU), retention rates, session length, and conversion funnels. Use tools like Mixpanel, Amplitude, or Firebase Analytics. Define your North Star metric — the single number that best represents the value your app delivers.",
      },
      {
        heading: "Responding to Reviews",
        body: "Monitor and respond to app store reviews regularly. Thank users for positive feedback and address negative reviews with empathy and action items. A thoughtful response to a 1-star review can turn a critic into an advocate.",
        type: "tip",
      },
      {
        heading: "Performance Monitoring",
        body: "Track app startup time, screen load times, and API response times. Set performance budgets and alert when they're exceeded. Users expect apps to feel instant — aim for under 2 seconds for cold start and under 300ms for screen transitions.",
        type: "warning",
      },
      {
        heading: "Post-Launch Checklist",
        body: "1. Verify crash reporting is capturing events\n2. Confirm analytics events are firing correctly\n3. Set up automated alerts for crash rate spikes\n4. Schedule weekly review of user feedback\n5. Plan your next release based on data and feedback",
        type: "steps",
      },
    ],
  },
];

export const checklistData = [
  {
    category: "Development",
    items: [
      { id: "dev-1", label: "Code repository set up with proper branching" },
      { id: "dev-2", label: "Linting and formatting configured" },
      { id: "dev-3", label: "Environment variables properly managed" },
      { id: "dev-4", label: "All core features implemented and working" },
    ],
  },
  {
    category: "Testing",
    items: [
      { id: "test-1", label: "Unit tests written for business logic" },
      { id: "test-2", label: "UI tested on multiple device sizes" },
      { id: "test-3", label: "Tested on both iOS and Android" },
      { id: "test-4", label: "Beta testing completed with real users" },
    ],
  },
  {
    category: "Store Preparation",
    items: [
      { id: "store-1", label: "App icon designed at 1024x1024" },
      { id: "store-2", label: "Screenshots prepared for all required sizes" },
      { id: "store-3", label: "App description and keywords optimized" },
      { id: "store-4", label: "Privacy policy URL created and linked" },
    ],
  },
  {
    category: "Submission",
    items: [
      { id: "sub-1", label: "App signed with correct certificates" },
      { id: "sub-2", label: "Build uploaded to App Store Connect / Play Console" },
      { id: "sub-3", label: "All metadata and screenshots uploaded" },
      { id: "sub-4", label: "Review notes provided for reviewers" },
    ],
  },
  {
    category: "Post-Launch",
    items: [
      { id: "post-1", label: "Crash reporting integrated and verified" },
      { id: "post-2", label: "Analytics events tracking correctly" },
      { id: "post-3", label: "Monitoring alerts configured" },
      { id: "post-4", label: "First update planned based on feedback" },
    ],
  },
];
