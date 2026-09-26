# Fix: confirmation emails not arriving

## Cause
The sender domain notify.zankyo.in is still **Pending**. Its DNS records are not visible yet at your domain provider, so branded emails can't be sent.

## Your step (at your domain provider for zankyo.in)
Add these records exactly:

| Type | Host / Name | Value |
|------|-------------|-------|
| TXT | `_lovable-email` | `lovable_email_verify=5dac37b18cd2bebee98f4dc9315c05d3241cc82143779bdd81c9744e2a03e488` |
| NS | `notify` | `ns3.lovable.cloud` |
| NS | `notify` | `ns4.lovable.cloud` |

Don't add any other records for `notify`, like A, CNAME or MX. They will conflict with these.

Then open Cloud → Emails and click **Verify Domain**. This usually takes minutes, and can take up to 72 hours.

## My steps after you add the records
1. Check the domain status again and confirm it shows Active.
2. Check the email logs for sends, rejections or blocked addresses for help@zankyo.in and aroy40548@gmail.com.
3. Test the "Resend confirmation" button on the admin sign-in page and confirm a send is recorded.
4. If a confirmation is still stuck, I'll give you a way to confirm the two admin accounts manually so you can sign in right away.
