# Anonymous numbers form (Tally) — not used in the first release

The first release collects nothing. Before enabling the form, restore the "optional anonymous numbers" section in
PRIVACY.md / PRIVACY.pl.md (legal basis: consent; Tally BV as processor; retention 24 months; IP address disclosed).
`npm run zip` refuses to build if the form URL is set but the policy doesn't mention it.


1. Create a free account at tally.so (Tally BV, Belgium; data stored in the EU; their DPA is accepted with the terms).
2. New form, title: **First You — anonymous weekly numbers**
3. Description (paste as is, with your policy link):
   > Paste the numbers the extension copied for you. They contain counts only: no chat content, no tries, no names.
   > Like any website, Tally sees your IP address. Details: <link to PRIVACY.md>
4. One question only: **Long answer**, label "Paste your numbers here", required.
   Do **not** add name, e-mail or free-text "anything else" fields: people would type personal data there.
   Feedback belongs in GitHub issues.
5. Settings: no login required, don't collect e-mails, no redirect to other sites.
6. Publish, copy the link, put it in `src/config.ts` → `ANON_FORM_URL`.
7. Keep submissions at most 24 months (see the policy section about the form): delete older ones in Tally once in a while.
