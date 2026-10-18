from pathlib import Path
import html,json
root=Path(__file__).resolve().parents[1]
items=[
('invite','You’re invited to Vessel','Your account is ready','Accept your invitation to start your personal health record. You can add family profiles when you’re ready.','Accept invitation','{{ .ConfirmationURL }}','After accepting, return to Vessel and request a sign-in link using your invited email.'),
('magic-link','Your Vessel sign-in link','Sign in to Vessel','Use the button below to securely return to your records.','Sign in to Vessel','{{ .ConfirmationURL }}','Open this link in the browser where you requested it, within 10 minutes. The link works once.'),
('confirmation','Confirm your Vessel email','Confirm your email','Confirm this email address to finish setting up your Vessel account.','Confirm email','{{ .ConfirmationURL }}','If you did not create this account, you can ignore this email.'),
('email-change','Confirm your new Vessel email','Confirm your new email','You requested to change the email address associated with your Vessel account.','Confirm email change','{{ .ConfirmationURL }}','If you did not request this change, do not use this link. Open Vessel directly to review your account.'),
('recovery','Reset your Vessel password','Reset your password','Use the button below to choose a new password for your account.','Reset password','{{ .ConfirmationURL }}','If you did not request a password reset, you can ignore this email. Your password has not changed.'),
('reauthentication','Your Vessel verification code','Verify it’s you','Enter this code in Vessel to confirm the account action you requested.',None,None,'Never share this code. If you did not request it, ignore this email.'),
]
for slug,title,body in [
('password-changed','Your password changed','The password for your Vessel account has been changed.'),
('email-changed','Your email changed','The email address associated with your Vessel account has been changed.'),
('phone-changed','Your phone number changed','The phone number associated with your Vessel account has been changed.'),
('identity-linked','A sign-in method was added','A new sign-in method has been linked to your Vessel account.'),
('identity-unlinked','A sign-in method was removed','A sign-in method has been removed from your Vessel account.'),
('mfa-added','A verification method was added','An additional verification method has been added to your Vessel account.'),
('mfa-removed','A verification method was removed','A verification method has been removed from your Vessel account.')]:
 items.append((slug,title+' | Vessel',title,body,'Open Vessel','{{ .SiteURL }}','If you did not make this change, open Vessel directly and contact your pilot administrator.'))
def render(item):
 slug,subject,title,body,button,url,note=item
 action=f'<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#6545a4" style="border-radius:12px"><a href="{url}" style="display:inline-block;padding:16px 26px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none">{button}</a></td></tr></table>' if button else '<p style="font-size:32px;letter-spacing:6px;font-weight:700;color:#382957">{{ .Token }}</p>'
 if slug=='magic-link': action+='<p style="margin:24px 0 8px;color:#625972;font-size:14px">Or enter this code in Vessel:</p><p style="margin:0;font-size:26px;letter-spacing:5px;font-weight:700;color:#382957">{{ .Token }}</p>'
 fallback=f'<p style="font-size:12px;line-height:1.6;color:#625972;word-break:break-all">Button not working? Copy this address into your browser:<br><a href="{url}" style="color:#6545a4">{url}</a></p>' if button else ''
 return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{html.escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f1f8;color:#252643;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">{html.escape(body)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f1f8"><tr><td align="center" style="padding:36px 16px">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px">
<tr><td style="padding:0 0 24px"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td><img src="https://vessel-blond-three.vercel.app/brand/icon-192.png" width="44" height="44" alt="" style="display:block;border:0;border-radius:10px"></td><td style="padding-left:10px;font-size:30px;font-weight:700;letter-spacing:-1px;color:#252643">vessel</td></tr></table></td></tr>
<tr><td bgcolor="#ffffff" style="border:1px solid #e4ddec;border-top:4px solid #8b70bb;border-radius:18px;padding:36px 28px">
<p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:2px;color:#705391">YOUR VESSEL ACCOUNT</p>
<h1 style="margin:0 0 18px;font-size:28px;line-height:1.25;letter-spacing:-0.6px;color:#252643">{html.escape(title)}</h1>
<p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#534d62">{html.escape(body)}</p>
{action}
<p style="margin:28px 0 0;padding:18px;background:#f6f3fa;border-radius:10px;font-size:14px;line-height:1.65;color:#534d62">{html.escape(note)}</p>
{fallback}
</td></tr><tr><td style="padding:24px 8px;font-size:12px;line-height:1.8;color:#70677f">Vessel · Personal &amp; family health records<br>This account email does not include medical information.<br>Please do not reply to this automated message.</td></tr>
</table></td></tr></table></body></html>'''
subjects={}
for item in items:
 (root/'supabase/email-templates'/f'{item[0]}.html').write_text(render(item));subjects[item[0]]=item[1]
(root/'supabase/email-templates/subjects.json').write_text(json.dumps(subjects,indent=2,ensure_ascii=False)+'\n')
preview=render(items[1]).replace('{{ .ConfirmationURL }}','#preview-only').replace('{{ .Token }}','123456').replace('{{ .SiteURL }}','#preview-only')
preview=preview.replace('<table role="presentation" width="100%"', '<div style="padding:16px;text-align:center;background:#252643;color:white;font:14px Arial">EMAIL DESIGN PREVIEW · Sample button and code only. <a style="color:#e4d9ff" href="https://vessel-blond-three.vercel.app/sign-in">Open the real Vessel sign-in page</a></div><table role="presentation" width="100%"',1)
(root/'design/email-preview.html').write_text(preview)
print(f'Generated {len(items)} email templates and a preview.')
