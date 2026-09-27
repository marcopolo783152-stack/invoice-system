# Invoice name and browser session policy

Invoice customer entry now says **Full name** with a **First and last name** hint. The stored name property is unchanged; no customer migration is needed.

Authenticated showroom and invoice sessions use Firebase browser-session persistence. On first use after this update, legacy persistent sign-ins are cleared and users sign in again. Login helpers await initialization.

A shared five-hour inactivity clock survives reloads. User input across same-account tabs refreshes activity; health checks do not. Expired sessions cannot be revived by a resumed tab's first input. Sign-out propagates to other same-account tabs.

When the browser reports offline, a privacy shield covers page content and local Firebase sign-out is requested. A no-cache website health check every 30 seconds with a 12-second timeout also detects connection failures. Server outages can sign users out. Saved invoices and customer records are not changed; unsaved input may require re-entry.

Normal tab/browser closure ends session persistence. Browser crash recovery and restore-tabs features may restore session storage; a website cannot reliably detect every closure or power loss. This change does not guarantee logout at power loss or revoke already-issued tokens on the server. The inactivity deadline is checked on resume. Strict server-managed session revocation requires further work.

Nine focused automated tests cover idle expiry, reloads, resumed tabs, cross-tab activity/logout and offline page locking. Authenticated browser/device testing remains necessary before production promotion, especially Safari/iPad, restored tabs and offline recovery. No production database records were changed.
