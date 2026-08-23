# ChiRho App Store Connect — submission and paste sheet

**Audit date:** August 20, 2026  
**Target:** iOS 1.1.0 · `com.thepines.chirho` · iPhone only  
**Status:** Backend hardening and production Clerk credentials are deployed, and the mobile release source passes health checks. **Do not submit build 45.** Build 46 is uploaded to App Store Connect and still requires Apple processing plus physical-device TestFlight acceptance testing.

This sheet is modeled on the successful process documented in `bls-app`, but every answer below is based on ChiRho's code and production site.

The current EAS project is `@thepines/chirho`. **Do not select or submit build 45** because it includes the Personal Plan placeholder payment flow. Fresh production **build 46** was created August 20, 2026 from the hardened working tree with production Clerk credentials.

## Recommended launch strategy

For the first reviewed version:

- Make the iOS app free.
- Remove or production-disable the Personal Plan fake payment, price, trial, and placeholder subscription flow.
- Do not show Stripe, external checkout links, or text suggesting payment will be added later.
- Keep organization-managed church access available without an in-app purchase link.
- Add Personal subscriptions later through StoreKit In-App Purchase. A matching web subscription can be added only after the App Store version has compliant IAP and the external-link rules for each storefront have been reviewed.
- Launch in the United States first. Add EU storefronts after trader-status and Digital Services Act requirements are complete.

The release source now fails closed with billing disabled, grants complimentary access, hides payment/trial copy, and rejects `subscribe_placeholder` server-side. Build 45 predates that fix and remains unsuitable for App Review.

## Stop-ship checklist

- [x] Remove or production-disable the fake Personal payment/trial flow.
- [x] Make account deletion purge all user-linked data, not only the Clerk user, group memberships, and loved-one photos. Include user settings/plan, prayer cards/decks, prayer focuses, group requests/messages where legally permitted, reports, blocks, push tokens, invitations, and other records keyed by Clerk ID.
- [x] If private-photo deletion fails, queue a durable retry or stop account deletion instead of silently leaving the blob behind.
- [x] Remove sensitive production logs containing names, phone numbers, push payloads, user IDs, and prayer content.
- [x] Require authentication and abuse controls for AI, transcription, and text-to-speech endpoints used by the app. Public prayer flows have rate, payload, and content limits.
- [x] Publish an accurate Privacy Policy with a fixed effective date.
- [x] Publish `https://www.chirho.ai/support`.
- [x] Publish `https://www.chirho.ai/delete-account`.
- [x] Publish `https://www.chirho.ai/terms` with an explicit minimum age.
- [ ] Monitor the support and privacy email addresses during review.
- [x] Configure Apple Team ID `MHH58HFTQG`; both apex and `www` AASA URLs return direct `200 application/json` responses for `com.thepines.chirho`.
- [x] Add deterministic server-side filtering for free-form group content while preserving report, block, admin review, and deletion tools.
- [x] Publish a monitored safety-report process with a 24-hour review target.
- [ ] Confirm licenses/permissions for every Scripture translation, liturgical text, image, background, narration voice, and other third-party asset. A disclaimer is not a content license.
- [x] Update Expo SDK 57 patch-level package mismatches; `npx expo install --check` reports dependencies are current.
- [x] Align `package.json` to `1.1.0` and move `expo-dev-client` to development-only dependencies.
- [x] Make `npx expo-doctor@latest` pass all 21 checks.
- [x] Make `npx tsc --noEmit` pass.
- [x] Review production dependency advisories without forcing an Expo downgrade. Sixteen remaining advisories are transitive Metro/config-plugin build-tool paths; recheck when Expo ships compatible updates.
- [x] Confirm build 46 uses the iOS 26 SDK or later (`DTSDKName: iphoneos26.5`).
- [ ] Inspect the archived build's Xcode Privacy Report and verify required-reason API declarations and SDK privacy manifests, especially Hermes and image-picker dependencies.
- [ ] Create and test a stable production Clerk reviewer phone number and fixed OTP.
- [ ] Test account deletion end-to-end with a disposable production account and verify that no raw Clerk ID or private photo remains.
- [ ] Test report, block, delete, notification opt-in/opt-out, photo removal, sign-out, and universal links on the exact TestFlight candidate.

### Additional security hardening

- Restrict wildcard CORS on transcription, text-to-speech, image, and audio routes to the origins that actually require browser access.
- Remove push-token values from the web profile UI and redact provider error bodies before logging.
- Add rate limits and authentication consistently to `/api/mobile/*` and expensive generation/media routes.
- Add production security headers such as HSTS, a tested Content Security Policy, `Referrer-Policy`, and clickjacking protection.
- Expose an authenticated unblock/manage-blocked-users flow so users can reverse a block.

## Confirmed privacy posture

ChiRho does **not** need App Tracking Transparency if the final build continues to:

- show no third-party advertising;
- use no advertising ID;
- share no app data with data brokers or ad networks; and
- perform no cross-app or cross-company advertising measurement.

Do not add `NSUserTrackingUsageDescription` and do not request ATT permission. First-party view/share counters are App Store **Usage Data**, but they are not Apple's definition of tracking. Remove them if they are not useful; otherwise disclose them.

### Native permissions

- **Photo library:** Yes, user initiated. Purpose: profile, home screen, prayer groups, loved ones, and prayer focuses.
- **Notifications:** Yes, requested only after a user enables a reminder or notification feature.
- **Camera:** No.
- **Microphone / audio recording:** No.
- **Location:** No.
- **Contacts / address book:** No.
- **Tracking / advertising identifier:** No.
- **Background audio:** Yes, playback only for prayer narration/music.

Suggested photo purpose string:

```txt
Choose photos for your profile, home screen, prayer groups, loved ones, and prayer focuses.
```

## App Privacy — App Store Connect answers

Use these answers after the stop-ship fixes are deployed and verified.

```txt
Does this app collect data? Yes
Data used to track users? No
Privacy Policy URL: https://www.chirho.ai/policy
User Privacy Choices URL: https://www.chirho.ai/delete-account
```

Declare these data types as **Linked to the User = Yes**, **Used for Tracking = No**:

- **Contact Info → Name:** App Functionality.
- **Contact Info → Phone Number:** App Functionality.
- **Contact Info → Email Address:** App Functionality, but only if the production Clerk/account flow can collect email.
- **Health & Fitness → Health:** App Functionality and Product Personalization because users can select health-related prayer needs. Reassess only if that input is removed.
- **Sensitive Info:** App Functionality and Product Personalization because traditions, prayer focuses, and prayer content can reveal religious beliefs.
- **User Content → Photos or Videos:** App Functionality for avatars, home backgrounds, group backgrounds, loved-one photos, and prayer-focus photos.
- **User Content → Emails or Text Messages:** App Functionality for group messages and prayer requests.
- **User Content → Other User Content:** App Functionality and Product Personalization for prayer focuses, loved-one entries, generated/saved prayers, group content, and settings not represented elsewhere.
- **Identifiers → User ID:** App Functionality.
- **Identifiers → Device ID:** App Functionality for Expo/APNs push tokens.
- **Usage Data → Product Interaction:** App Functionality and Analytics for prayer view/share counts, reminder activity, and service activity timestamps.
- **Diagnostics → Other Diagnostic Data:** App Functionality. Mark linked to the user while logs contain account IDs or user content. It may be changed to not linked only after collection is de-identified before storage and cannot be relinked.

For a free build with the payment placeholder removed:

```txt
Purchases: No
Payment Info: No
Financial Info: No
Location: No
Contacts: No
Audio Data: No
Advertising Data: No
Browsing History: No
Tracking: No
```

Do not claim that photos are uncollected merely because access is optional. Selected photos are uploaded and retained, so Apple requires disclosure.

## Privacy Policy requirements

The revised public policy should plainly disclose:

- Controller/operator legal name and monitored contact details.
- Required phone authentication through Clerk.
- Names, phone number, profile/avatar, church and group membership.
- Religious preferences, prayer focuses, health-related categories, loved-one names/categories/virtues, prayers, messages, reports, and blocks.
- Optional photos, their private access controls, storage, removal, and account-deletion behavior.
- Push tokens and notification preferences.
- First-party prayer view/share counters and service logs.
- Google Gemini and OpenAI processing of prompts/prayer context.
- ElevenLabs processing of generated prayer text for narration.
- Clerk, MongoDB Atlas, Vercel hosting/Blob, Railway, AWS S3, Expo/APNs, and SimpleTexting as applicable processors.
- That data is not sold, used for targeted advertising, or used for cross-company tracking.
- Retention periods or criteria for every major data class.
- How a user deletes individual content and the entire account.
- Public deletion instructions and privacy/support contact addresses.
- A fixed effective date and how material changes are communicated.

The public policy was replaced and deployed on August 20, 2026. Recheck its disclosures whenever processors, authentication, billing, analytics, or user-content behavior changes.

## Product page copy

### Name — limit 30

```txt
ChiRho
```

### Subtitle — 29/30

```txt
Daily Prayer, Shared in Faith
```

### Primary category

```txt
Lifestyle
```

### Secondary category

```txt
Reference
```

### Promotional text — 148/170

```txt
Build a daily rhythm of prayer with personalized cards, guided audio, loved-one intentions, and private prayer groups rooted in Christian tradition.
```

### Description — limit 4,000

```txt
ChiRho helps individuals and churches build a consistent rhythm of Christian prayer.

A DAILY PRAYER RHYTHM
Open a fresh prayer deck, reflect on Scripture, and return throughout the day. Save prayer cards and listen to guided narration when you want a quieter, hands-free experience.

PRAYER SHAPED FOR YOU
Choose your Christian tradition and prayer focuses to create prayer cards grounded in Scripture and established liturgical practices.

PRAY FOR THE PEOPLE YOU LOVE
Add loved ones using simple names, prayer areas, and virtues. Optional photos stay private to your authenticated account and never appear in public prayer links, group shares, notifications, or social previews.

PRAY TOGETHER
Join a church community or private prayer group, share prayer requests, and encourage one another. Members can report inappropriate content and block another user.

YOU STAY IN CONTROL
Choose what you share, manage reminders, remove photos and prayer content, leave groups, or delete your account from Profile.

PRIVACY BY DESIGN
ChiRho has no advertising and does not track you across apps or websites. Photo access and notifications are optional and requested only when you use those features.

ChiRho — ancient prayer for a new world.
```

### Keywords — 93/100

```txt
christian,devotional,liturgy,church,scripture,intercession,worship,anglican,catholic,orthodox
```

### Copyright

Replace the legal owner if needed:

```txt
2026 The Pines
```

### What's New

For an update rather than the first public version:

```txt
Introducing private loved-one photos, prayer groups with reporting and blocking controls, refreshed prayer cards, improved reminders, and a redesigned profile experience.
```

### Version release

```txt
Manually release this version
```

## Age rating questionnaire

Use the final binary as the source of truth:

```txt
Made for Kids: No
Parental Controls: No
Age Assurance: No
Unrestricted Web Access: No
User-Generated Content: Yes
Messaging and Chat: Yes
Social Media: No
Advertising: No
Medical or Treatment Information: None
Health or Wellness Topics: Infrequent
Gambling / Contests / Loot Boxes: None
Sexual Content / Nudity: None
Violence / Weapons: None
```

Do not force an 18+ override unless ChiRho's Terms impose that minimum. Let App Store Connect calculate the rating from truthful answers.

## Export compliance

```txt
Uses encryption: Yes — standard HTTPS/TLS and platform authentication.
Uses non-exempt encryption: No.
Encryption documentation upload required: No.
```

`ITSAppUsesNonExemptEncryption` is already `false` in `app.json`.

## Content rights

```txt
Contains, displays, or accesses third-party content: Yes.
```

Use this only after rights are verified:

```txt
ChiRho displays Scripture, liturgical text, artwork, and audio that is owned by ChiRho, in the public domain, or used under applicable licenses and permissions.
```

Keep a private rights worksheet naming each source, owner, license, permitted use, attribution requirement, and evidence. Specifically verify the ESV and Book of Common Prayer material.

## App Review information

```txt
Sign-in required: Yes
Demo phone: TODO_PRODUCTION_REVIEW_PHONE
Demo password/code: No password — phone OTP. Use code TODO_PRODUCTION_FIXED_OTP.
First name: Kendall
Last name: TODO_LAST_NAME
Phone: TODO_REVIEW_CONTACT_PHONE
Email: TODO_MONITORED_SUPPORT_EMAIL
```

## App Review notes — paste after all TODOs and stop-ship work are complete

```txt
ChiRho is a native iPhone prayer app for individuals, churches, and private prayer groups.

Please use the production demo phone number and fixed OTP supplied in App Review Information. No email/password login is used.

Suggested review path:
1. Sign in with the demo phone and OTP.
2. Home: open the daily prayer deck, a prayer card, and audio playback.
3. Profile: review Loved Ones, Prayer Focuses, Prayer Cards, Notifications, Privacy, and Delete Account.
4. Groups: open the preconfigured demo group, view a prayer request, and open the content options menu to see Report and Block.

Privacy and permissions:
- Photo Library access is optional and requested only after the user chooses an avatar, group background, or loved-one photo. Loved-one photos are private to the authenticated owner and are excluded from public prayer links, group shares, notifications, and social previews.
- Notification permission is requested only after the user enables a reminder or notification setting.
- Camera, microphone recording, location, contacts, advertising identifiers, and App Tracking Transparency are not used.
- Background audio is used only to continue prayer narration/music playback.
- The app contains no advertising and performs no cross-app or cross-company tracking.

User-generated content:
- Group prayer requests and responses can contain member-authored text.
- Members can report individual content and block its author from the content options menu.
- Authors and group administrators can delete content. Reports are available to administrators for timely review.

Account deletion:
- Open Profile and choose Delete account at the bottom of the drawer.
- Confirming deletion removes the account and associated personal data and signs the user out.
- Public instructions: https://www.chirho.ai/delete-account

Commerce:
- This iOS build has no consumer purchase flow, external checkout link, paid trial, or digital subscription.
- Some participating organizations provision community access outside the app. Individual users are not directed to an external purchase method.

Privacy Policy: https://www.chirho.ai/policy
Support: https://www.chirho.ai/support
```

## Screenshots

Upload one to ten nontransparent PNG/JPEG screenshots. Because `supportsTablet` is false, iPad screenshots are not required. Use an accepted 6.9-inch portrait size such as **1320 × 2868**, **1290 × 2796**, or **1260 × 2736**.

Capture only from the exact TestFlight candidate with fictional demo data:

1. Home and daily prayer deck.
2. A polished prayer card.
3. Guided audio playback.
4. Loved ones with fictional names and licensed/non-personal photos.
5. A populated demo prayer group.
6. Profile privacy and notification controls.

Never show real phone numbers, real loved-one photos, private prayers, debug UI, placeholder payments, or development-key warnings.

## Final build and submission sequence

The EAS `production` environment now uses the publishable key from the verified Clerk production instance. Reject any future build that logs a Clerk development-key warning.

```sh
cd /Users/kdub-mac14-2021/chirho-app
npx expo install --check
npx expo-doctor@latest
npx tsc --noEmit
npm audit --omit=dev
npx expo export --platform ios
npx eas-cli@latest build --platform ios --profile production
```

After the build is processed:

1. Install that exact build through TestFlight on a physical iPhone.
2. Run the full privacy, deletion, permissions, moderation, deep-link, and sign-in checklist.
3. Confirm the archived build uses the iOS 26 SDK or later.
4. Confirm the Privacy Report matches the App Privacy answers above.
5. Capture screenshots from that candidate.
6. Complete App Store Connect metadata, age rating, content rights, export compliance, privacy labels, availability, reviewer credentials, and review notes.
7. Select **Manually release this version**.
8. Submit the selected build:

```sh
npx eas-cli@latest submit --platform ios --profile production
```

9. Select the processed build in App Store Connect and choose **Add for Review**.

## Final TestFlight acceptance checklist

- [ ] Fresh install and phone OTP work with production credentials.
- [ ] No Clerk development-key warning.
- [ ] No placeholder/fake payment text or consumer external checkout.
- [ ] Photo permission appears only after user action and its purpose string is accurate.
- [ ] Notification permission appears only after opt-in.
- [ ] Denying either permission leaves the app usable.
- [ ] Private photos cannot be fetched by another account or through a public prayer URL.
- [ ] Public share includes only content the user intentionally published.
- [ ] Reported/blocked content disappears as designed and admins can review reports.
- [ ] Account deletion signs out, removes the Clerk account, removes private blobs, and leaves no raw user ID in application collections.
- [ ] `https://www.chirho.ai/policy`, `/support`, and `/delete-account` load without authentication.
- [ ] Universal links open the app and web fallback still works.
- [ ] Push notifications contain no unnecessary sensitive prayer details on the lock screen.
- [ ] All screenshots contain fictional data.
- [ ] App Privacy answers match the exact production behavior.

## Authoritative Apple references

- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Account deletion: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Third-party SDK/privacy manifest requirements: https://developer.apple.com/support/third-party-SDK-requirements/
- Screenshot specifications: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/
- Current SDK submission requirements: https://developer.apple.com/app-store/submitting/
