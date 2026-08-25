# App Store Review Notes (ChiRho 1.1.0)

Paste the **Reviewer notes** section into App Store Connect. Fill in the Clerk test phone before submitting.

## Reviewer notes

**Build:** 63

**Sign-in:** Phone number + one-time code only (Clerk). There is no email/password login.

**Demo account:** Use this Clerk test number and verification code:

- Phone: `[ADD CLERK TEST NUMBER, e.g. +1 555 555 0100]`
- Code: `[ADD THE CODE CONFIGURED IN CLERK, e.g. 424242]`

Create the test number in the Clerk Dashboard (Configure → Phone numbers / testing) so the reviewer can complete OTP without SMS.

**Privacy Policy:** https://www.chirho.ai/policy
**Terms of Use:** https://www.chirho.ai/terms
Both links are available during sign-up and in Profile. New-account sign-up requires a Terms and Privacy switch confirming the user is at least 13 years old. AI-assisted prayer permission is requested with a separate optional switch; a compact Details control identifies Google Gemini, OpenAI, ElevenLabs, and the information sent.

**Demo path**

1. Sign in with the test phone and code.
2. Home: open the daily prayer deck and a prayer card.
3. Groups: open a group, members, and a prayer request if present.
4. Profile: Loved ones, Prayer cards, Privacy (Share with groups / Public prayer links), Sign out.

**Notes for Guideline 5.1.1 / 1.2**

- Push permission is requested only after the user turns on a daily prayer reminder or a notification setting, not at first launch.
- Prayer text, first names, tradition, prayer categories, and details the user chooses may be sent to Google Gemini or OpenAI only with the recorded AI-assisted prayer permission. Generated narration text may be sent to ElevenLabs. Phone numbers and uploaded photos are not sent to these AI providers.
- ElevenLabs workspace model-improvement sharing is disabled.
- Loved-one photos stay private. Sharing a prayer publishes the text only; photos are not on the public page.
- Group chat/prayer requests are user-generated. Members can report content and block users.
- Background audio is in-app prayer narration, not music streaming.

**Universal links:** `https://www.chirho.ai/.well-known/apple-app-site-association` returns the association file for `MHH58HFTQG.com.thepines.chirho`. Invite and group links open the app when it is installed.
