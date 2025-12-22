# Copilot Instructions for Rug Business Invoice System

## Project Overview
This is a multi-platform invoice management system for rug businesses, built with Next.js (frontend), Electron (desktop), and Capacitor (mobile). It supports invoice creation, printing, PDF export, user management, and Firebase integration for authentication and storage.

## Key Architecture & Patterns
- **Frontend:** Located in `app/` and `components/`. Uses Next.js pages and React components. Styling via CSS modules.
- **Business Logic:** Centralized in `lib/` (e.g., `calculations.ts`, `invoice-storage.ts`, `pdf-utils.ts`).
- **Config:** Business-specific settings in `config/business.ts`.
- **Electron:** Entry in `electron.js`, builder config in `electron-builder.json`.
- **Capacitor:** Mobile config in `capacitor.config.json`.
- **Firebase:** Auth/storage logic in `lib/firebase-auth.ts` and `lib/firebase-storage.ts`.

## Developer Workflows
- **Install:** `npm install`
- **Dev Server:** `npm run dev` (Next.js at `localhost:3000`)
- **Build Web:** `npm run build`
- **Build Electron:** See `README.md` for Electron build steps; output in `electron-dist/`.
- **Mobile (Capacitor):** See `README.md` for platform-specific commands.
- **Deploy:** Static hosting (Vercel, Netlify, AWS S3) after build.

## Conventions & Patterns
- **Invoice Data:** See `InvoiceForm.tsx`, `InvoiceTemplate.tsx`, and `lib/invoice-storage.ts` for data flow and structure.
- **PDF/Print:** PDF export and print logic in `lib/pdf-utils.ts` and print styles in `app/print.css`.
- **User Management:** Components in `UserManagement.tsx`, logic in `lib/firebase-auth.ts`.
- **Signature Capture:** `SignaturePad.tsx` for customer signatures.
- **Terms & Conditions:** Hardcoded in invoice templates; see `InvoiceTemplate.tsx`.
- **CSS Modules:** All React components use local CSS modules for styling.

## Integration Points
- **Firebase:** Used for authentication and file storage. Configured in `lib/firebase.ts`.
- **Email:** Email logic in `lib/email-service.ts`.
- **Bulk Export:** CSV template in `lib/address-book-template.csv`, logic in `lib/bulk-export.ts`.

## Reference Files
- **QUICKSTART.md:** Fast onboarding steps.
- **CHEATSHEET.md:** Common tasks and commands.
- **README.md:** Full documentation and build/deploy instructions.

## Examples
- To add a new invoice field, update `InvoiceForm.tsx`, `InvoiceTemplate.tsx`, and `lib/invoice-storage.ts`.
- To change business info, edit `config/business.ts`.
- To customize print/PDF, modify `app/print.css` and `lib/pdf-utils.ts`.

---
For unclear or missing conventions, check `README.md`, `QUICKSTART.md`, or ask for clarification.
