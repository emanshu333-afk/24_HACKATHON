import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { writeFileSync } from 'node:fs';

const fontSize = 10;
const headingSize = 13;
const subHeadingSize = 11;
const lineHeight = 14;
const marginX = 50;
const marginY = 50;
const pageWidth = 612;  // letter
const pageHeight = 792;
const maxWidth = pageWidth - marginX * 2;

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

function wrapText(text, fontObj, size, maxWidthPx) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const width = fontObj.widthOfTextAtSize(testLine, size);
    if (width > maxWidthPx && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function addPage() {
  return pdf.addPage([pageWidth, pageHeight]);
}

function drawText(page, text, x, y, size, fontObj, color = rgb(0, 0, 0)) {
  page.drawText(text, { x, y, size, font: fontObj, color });
}

function drawWrapped(page, text, x, y, size, fontObj, color = rgb(0, 0, 0), lineHeightPx = lineHeight) {
  const lines = wrapText(text, fontObj, size, maxWidth);
  for (const line of lines) {
    page.drawText(line, { x, y, size, font: fontObj, color });
    y -= lineHeightPx;
  }
  return y;
}

function drawHeading(page, text, y) {
  y = drawWrapped(page, text, marginX, y, headingSize, boldFont, rgb(0.1, 0.2, 0.4));
  y -= 6;
  page.drawLine({
    start: { x: marginX, y: y + 4 },
    end: { x: marginX + 120, y: y + 4 },
    thickness: 1,
    color: rgb(0.1, 0.2, 0.4),
  });
  return y - 10;
}

function drawSubHeading(page, text, y) {
  return drawWrapped(page, text, marginX, y, subHeadingSize, boldFont, rgb(0.2, 0.3, 0.5));
}

function drawBody(page, text, y) {
  return drawWrapped(page, text, marginX, y, fontSize, font);
}

function drawBullet(page, text, y) {
  const wrapped = wrapText(text, font, fontSize, maxWidth - 20);
  page.drawText('-', { x: marginX, y, size: fontSize, font, color: rgb(0, 0, 0) });
  y -= lineHeight;
  for (let i = 0; i < wrapped.length; i++) {
    const x = i === 0 ? marginX + 20 : marginX + 20;
    page.drawText(wrapped[i], { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  }
  return y;
}

function ensureSpace(page, y, needed = 60) {
  if (y < marginY + needed) {
    return { page: addPage(), y: pageHeight - marginY };
  }
  return { page, y };
}

let page = addPage();
let y = pageHeight - marginY;

// Title
page = ensureSpace(page, y, 80).page;
y = ensureSpace(page, y, 80).y;
page.drawText('VeriMark - Frontend Partner Instructions', {
  x: marginX, y, size: 20, font: boldFont, color: rgb(0.1, 0.2, 0.4),
});
y -= 24;
page.drawText('Hackathon H8 - Tamper-Proof Exam Result Ledger', {
  x: marginX, y, size: 12, font: font, color: rgb(0.3, 0.3, 0.3),
});
y -= 24;
page.drawText('Backend engineer: src/app.js, src/service.js, src/crypto.js  •  Frontend: React + Vite (you)', {
  x: marginX, y, size: 10, font: font, color: rgb(0.5, 0.5, 0.5),
});
y -= 30;

// Section 1
const { page: p1, y: y1 } = ensureSpace(page, y, 40);
page = p1; y = y1;
y = drawHeading(page, '1. What We Are Building', y);
y = drawBody(page, 'Problem: Exam marks can be changed after publication, leaving students unable to prove their original marks.', y);
y -= 4;
y = drawBody(page, 'Solution: Every published result is cryptographically committed to an append-only hash-chain ledger with SHA-256 commitments and Ed25519 signatures.', y);
y -= 4;
y = drawBullet(page, 'Your job: React + Vite frontend consuming the backend HTTP API.', y);
y -= 2;
y = drawBullet(page, 'My job: Node/Express + PostgreSQL/Prisma backend (branch backend/h8-core).', y);
y -= 10;

// Section 2
const { page: p2, y: y2 } = ensureSpace(page, y, 40);
page = p2; y = y2;
y = drawHeading(page, '2. Repository and Branches', y);
y = drawBody(page, 'Repository: git@github.com:emanshu333-afk/24_HACKATHON.git', y);
y -= 4;
y = drawBody(page, 'My branch (backend): backend/h8-core - do not touch or push to this.', y);
y -= 4;
y = drawBody(page, 'Your branch (frontend): frontend - create it from main.', y);
y -= 6;
y = drawBody(page, 'Git workflow:', y);
y -= 2;
y = drawBody(page, 'git clone git@github.com:emanshu333-afk/24_HACKATHON.git', marginX + 20, y, fontSize, font);
y -= 14;
y = drawBody(page, 'cd 24_HACKATHON', marginX + 20, y, fontSize, font);
y -= 14;
y = drawBody(page, 'git checkout -b frontend', marginX + 20, y, fontSize, font);
y -= 14;
y = drawBody(page, 'git pull origin backend/h8-core   (before every session)', marginX + 20, y, fontSize, font);
y -= 14;
y = drawBody(page, 'git push origin frontend', marginX + 20, y, fontSize, font);
y -= 10;
y = drawBody(page, 'Rules: Never force-push. Do not modify backend/h8-core. Pull each other’s branches before starting work.', y);
y -= 10;

// Section 3
const { page: p3, y: y3 } = ensureSpace(page, y, 40);
page = p3; y = y3;
y = drawHeading(page, '3. What the Backend Has Already Done', y);
y = drawBody(page, 'Branch backend/h8-core is pushed to GitHub. Backend is complete and tested (104 tests passing, 0 failed):', y);
y -= 6;
y = drawBullet(page, 'Authentication: JWT login (HS256, 1-hour expiry), scrypt password hashing, role-based authorization (ADMIN, STUDENT, APPROVER, AUDITOR), student ownership enforcement.', y);
y -= 2;
y = drawBullet(page, 'Publishing: Admin publishes results; each result gets a SHA-256 commitment, signed Ed25519 ledger event, signed checkpoint, and receipt.', y);
y -= 2;
y = drawBullet(page, 'Ledger: Append-only SHA-256 hash chain from genesis.', y);
y -= 2;
y = drawBullet(page, 'Corrections: Two distinct approver Ed25519 signatures bound to the exact proposal digest. Original preserved as VALID_HISTORICAL; corrected is VALID_CURRENT.', y);
y -= 2;
y = drawBullet(page, 'Verification: Public /verify returns full evidence (events + checkpoint) plus structured status. You must independently verify against a pinned institution public key.', y);
y -= 2;
y = drawBullet(page, 'QR marksheets: Printable HTML with QR PNG encoding /verify?receipt=<base64url(receipt)>. QR contains no student names.', y);
y -= 2;
y = drawBullet(page, 'API contract: docs/API.md, docs/openapi.json (19 operations).', y);
y -= 2;
y = drawBullet(page, 'TypeScript types: docs/frontend-contract/api.types.ts.', y);
y -= 2;
y = drawBullet(page, 'Fixtures: fixtures/proof-vectors.json (signed synthetic evidence), fixtures/frontend.json (UI shapes).', y);
y -= 10;

// Section 4
const { page: p4, y: y4 } = ensureSpace(page, y, 40);
page = p4; y = y4;
y = drawHeading(page, '4. Where to Start (Read These Files First)', y);
y = drawBody(page, 'After cloning and checking out frontend, read these files from the backend/h8-core branch:', y);
y -= 6;
y = drawBullet(page, 'docs/FRONTEND_INTEGRATION_PACKET.md - Complete integration contract (read this first)', y);
y -= 2;
y = drawBullet(page, 'docs/SYSTEM_ARCHITECTURE_FOR_FRONTEND.md - High-level architecture and page-to-endpoint mapping', y);
y -= 2;
y = drawBullet(page, 'docs/API.md - Endpoint details, examples, failure codes', y);
y -= 2;
y = drawBullet(page, 'docs/openapi.json - Machine-readable OpenAPI 3.1 definitions', y);
y -= 2;
y = drawBullet(page, 'docs/PROOF_SPEC.md - Exact byte encoding, hash/signature protocol, trust model', y);
y -= 2;
y = drawBullet(page, 'docs/frontend-contract/api.types.ts - TypeScript interfaces to copy into your frontend', y);
y -= 2;
y = drawBullet(page, 'fixtures/proof-vectors.json - Signed synthetic fixtures for verifier testing', y);
y -= 2;
y = drawBullet(page, 'fixtures/frontend.json - Example UI data shapes (not cryptographic proof)', y);
y -= 10;

// Section 5
const { page: p5, y: y5 } = ensureSpace(page, y, 40);
page = p5; y = y5;
y = drawHeading(page, '5. API Base and Environment', y);
y = drawBody(page, 'Local backend runs at:', y);
y -= 4;
y = drawBody(page, 'VITE_API_BASE_URL=http://localhost:3000', marginX + 20, y, fontSize, font);
y -= 14;
y = drawBody(page, 'FRONTEND_ORIGIN=http://localhost:5173', marginX + 20, y, fontSize, font);
y -= 10;
y = drawBody(page, 'If your React app runs on another laptop, localhost means that laptop. Use my machine’s LAN IP for cross-device testing. Never connect the browser directly to PostgreSQL.', y);
y -= 6;
y = drawBody(page, 'To run the backend locally:', y);
y -= 2;
y = drawBody(page, 'npm ci && npm run dev:setup && npm run db:generate && npm run db:migrate && npm run db:seed && npm test && npm start', marginX + 20, y, fontSize, font);
y -= 14;
y = drawBody(page, 'Demo credentials are in .local/demo-credentials.json (Git-ignored - ask me privately if you need them).', y);
y -= 10;

// Section 6
const { page: p6, y: y6 } = ensureSpace(page, y, 40);
page = p6; y = y6;
y = drawHeading(page, '6. Authentication Integration', y);
y = drawBody(page, '1. POST /auth/login with {email, password} -> returns {token, expiresIn: 3600, user:{id,role,email}}.', y);
y -= 4;
y = drawBody(page, '2. Store the JWT in memory. Send Authorization: Bearer <token> on protected requests.', y);
y -= 4;
y = drawBody(page, '3. JWT expires in 1 hour. No refresh token; re-login after expiry.', y);
y -= 4;
y = drawBody(page, '4. Role comes from the server database, not from JWT claims. Client-supplied role claims are ignored.', y);
y -= 4;
y = drawBody(page, '5. Students can only access their own results (result.studentId === user.student.id).', y);
y -= 4;
y = drawBody(page, '6. CORS allows only one configured FRONTEND_ORIGIN. Tell me your dev origin so I can configure it.', y);
y -= 4;
y = drawBody(page, '7. Logout = delete the token. No server-side session.', y);
y -= 10;

// Section 7
const { page: p7, y: y7 } = ensureSpace(page, y, 40);
page = p7; y = y7;
y = drawHeading(page, '7. Public Verification Flow (CRITICAL)', y);
y = drawBody(page, 'The QR code on a marksheet encodes:', y);
y -= 4;
y = drawBody(page, 'http://localhost:3000/verify?receipt=<base64url(JSON signed receipt)>', marginX + 20, y, fontSize, font);
y -= 14;
y = drawBody(page, 'When verifying:', y);
y -= 2;
y = drawBullet(page, 'GET /verify?receipt=<token> -> returns {verification, evidence}.', y);
y -= 2;
y = drawBullet(page, 'Independently run verifyEvidence(evidence, PINNED_INSTITUTION_PUBLIC_KEY, {receipt}).', y);
y -= 2;
y = drawBullet(page, 'Port the verifier from shared/browser-verifier.js into your React app.', y);
y -= 2;
y = drawBullet(page, 'Pin the institution SPKI Ed25519 public key out of band - never accept a key from the API response.', y);
y -= 2;
y = drawBullet(page, 'Check status and failures: VALID_CURRENT + empty failures = verified current result; VALID_HISTORICAL = verified historical result; INVALID = not verified; INCOMPLETE = verification unavailable.', y);
y -= 2;
y = drawBullet(page, 'Compare displayed marks against verification.result using compareDisplayedResult(verification, displayed).', y);
y -= 4;
y = drawBody(page, 'Never trust verified: true from the server alone.', y);
y -= 10;

// Section 8
const { page: p8, y: y8 } = ensureSpace(page, y, 40);
page = p8; y = y8;
y = drawHeading(page, '8. Page-to-Endpoint Mapping', y);

const rows = [
  ['Login', 'POST /auth/login', 'Public', 'Yes'],
  ['My account', 'GET /me', 'Any', 'Yes'],
  ['Admin dashboard', 'GET /results, /students, /exams', 'ADMIN', 'Yes'],
  ['Student dashboard', 'GET /results (own), GET /me', 'STUDENT', 'Yes'],
  ['Publish results', 'POST /results', 'ADMIN', 'Yes'],
  ['Result listing', 'GET /results', 'Any', 'Yes'],
  ['Result details', 'GET /results/:id', 'Any + ownership', 'Yes'],
  ['Result history', 'GET /results/:id/history', 'Any + ownership', 'Yes'],
  ['Printable marksheet', 'GET /results/:id/marksheet/:version', 'Any + ownership', 'Yes'],
  ['QR / public verification', 'GET /verify?receipt=', 'Public', 'Yes'],
  ['Correction proposal', 'POST /results/:id/corrections', 'ADMIN', 'Yes'],
  ['Correction detail', 'GET /corrections/:id', 'Staff', 'Yes'],
  ['First approval', 'POST /corrections/:id/approvals', 'APPROVER', 'Yes'],
  ['Second approval', 'POST /corrections/:id/approvals', 'APPROVER', 'Yes'],
  ['Correction timeline', 'GET /corrections', 'Staff', 'Yes'],
  ['Ledger explorer', 'GET /ledger/events?after=&limit=', 'Staff', 'Yes'],
  ['Integrity audit', 'POST /audits', 'ADMIN/AUDITOR', 'Yes'],
  ['User registration', '-', '-', 'MISSING'],
  ['Password reset', '-', '-', 'MISSING'],
  ['Refresh token', '-', '-', 'MISSING'],
];

// Table header
const colX = [marginX, marginX + 130, marginX + 260, marginX + 360];
const headerY = y;
page.drawText('Frontend Page', { x: colX[0], y: headerY, size: 9, font: boldFont });
page.drawText('Endpoint', { x: colX[1], y: headerY, size: 9, font: boldFont });
page.drawText('Role', { x: colX[2], y: headerY, size: 9, font: boldFont });
page.drawText('Implemented', { x: colX[3], y: headerY, size: 9, font: boldFont });
y -= 16;

for (const row of rows) {
  const { page: np, y: ny } = ensureSpace(page, y, 30);
  page = np; y = ny;
  page.drawText(row[0], { x: colX[0], y, size: 8.5, font });
  page.drawText(row[1], { x: colX[1], y, size: 8.5, font });
  page.drawText(row[2], { x: colX[2], y, size: 8.5, font });
  page.drawText(row[3], { x: colX[3], y, size: 8.5, font });
  y -= 13;
}
y -= 4;
y = drawBody(page, 'Missing APIs are not stubbed. If you need them, propose the API and we coordinate before implementation.', y);
y -= 10;

// Section 9
const { page: p9, y: y9 } = ensureSpace(page, y, 40);
page = p9; y = y9;
y = drawHeading(page, '9. Correction Approval Workflow', y);
y = drawBody(page, '1. Admin creates proposal via POST /results/:id/corrections -> returns proposal with digest.', y);
y -= 4;
y = drawBody(page, '2. Each approver reviews the proposal body, then signs {proposalDigest} locally with their own Ed25519 private key.', y);
y -= 4;
y = drawBody(page, '3. Frontend POSTs {signature} to /corrections/:id/approvals under that approver’s JWT.', y);
y -= 4;
y = drawBody(page, '4. First approval: applied:false. Second distinct valid approver: applied:true and result advances.', y);
y -= 4;
y = drawBody(page, '5. Never send private keys to the API. Never treat two database approval flags as equivalent to two digital signatures.', y);
y -= 4;
y = drawBody(page, '6. On 409 stale base, fetch current history and create a new proposal (never silently rebase signatures).', y);
y -= 10;

// Section 10
const { page: p10, y: y10 } = ensureSpace(page, y, 40);
page = p10; y = y10;
y = drawHeading(page, '10. TypeScript Types and Fixtures', y);
y = drawBody(page, 'Copy docs/frontend-contract/api.types.ts into your frontend package. It covers User, LoginRequest/Response, Student, Examination, Mark, ResultRecord, PublishedData, ResultReceipt, Verification, VerificationResponse, CorrectionProposal, ApprovalRequest, IntegrityAudit, ApiError, VerifyOptions, BrowserVerifier, and more.', y);
y -= 6;
y = drawBody(page, 'Test your verifier against fixtures/proof-vectors.json, which contains signed synthetic evidence for current, historical, corrected, and tampered results.', y);
y -= 4;
y = drawBody(page, 'All fixture data is synthetic and marked as such.', y);
y -= 10;

// Section 11
const { page: p11, y: y11 } = ensureSpace(page, y, 40);
page = p11; y = y11;
y = drawHeading(page, '11. How to Test Your Frontend Against the Backend', y);
y = drawBullet(page, 'Pull my latest docs: git pull origin backend/h8-core', y);
y -= 2;
y = drawBullet(page, 'Start the backend (see section 5) or use a deployed URL if we set one up.', y);
y -= 2;
y = drawBullet(page, 'Set VITE_API_BASE_URL to the backend URL.', y);
y -= 2;
y = drawBullet(page, 'Log in with a demo account.', y);
y -= 2;
y = drawBullet(page, 'Publish a result, get a receipt, generate/verify QR.', y);
y -= 2;
y = drawBullet(page, 'Run independent verification on the evidence.', y);
y -= 2;
y = drawBullet(page, 'Propose a correction, collect two approver signatures, finalize.', y);
y -= 2;
y = drawBullet(page, 'Verify original stays VALID_HISTORICAL and corrected is VALID_CURRENT.', y);
y -= 2;
y = drawBullet(page, 'Tamper with marks directly in the database (on a disposable schema) and confirm the audit detects it.', y);
y -= 10;

// Section 12
const { page: p12, y: y12 } = ensureSpace(page, y, 40);
page = p12; y = y12;
y = drawHeading(page, '12. Coordination Items - Tell Me', y);
y = drawBullet(page, 'Your frontend dev origin (e.g., http://localhost:5173) so I can set FRONTEND_ORIGIN.', y);
y -= 2;
y = drawBullet(page, 'If you need any missing endpoints (registration, password reset, etc.) - propose first, I implement.', y);
y -= 2;
y = drawBullet(page, 'If you want a deployed/backend URL instead of localhost - tell me (requires your permission for any external deployment).', y);
y -= 2;
y = drawBullet(page, 'Report any API contract mismatches immediately so we record breaking changes in docs/API.md.', y);
y -= 10;

// Section 13
const { page: p13, y: y13 } = ensureSpace(page, y, 40);
page = p13; y = y13;
y = drawHeading(page, '13. Honest Limitations', y);
y = drawBullet(page, 'No independently operated witness service yet; local checkpoint files are not operational rollback protection.', y);
y -= 2;
y = drawBullet(page, 'Browser verifier module exists but is tested via Node WebCrypto, not yet in a real React UI.', y);
y -= 2;
y = drawBullet(page, 'Physical printed/phone QR scan not tested.', y);
y -= 2;
y = drawBullet(page, 'No TLS/deployment; API binds loopback in development.', y);
y -= 2;
y = drawBullet(page, 'Full-chain proofs expose pseudonymous marks for all events; not privacy-scalable at large scale.', y);
y -= 10;

// Section 14
const { page: p14, y: y14 } = ensureSpace(page, y, 40);
page = p14; y = y14;
y = drawHeading(page, '14. Quick Start Checklist', y);
const checklist = [
  'Clone repo, checkout frontend branch from main',
  'Pull backend/h8-core to get latest docs',
  'Read docs/FRONTEND_INTEGRATION_PACKET.md and docs/SYSTEM_ARCHITECTURE_FOR_FRONTEND.md',
  'Copy docs/frontend-contract/api.types.ts into frontend',
  'Set VITE_API_BASE_URL and FRONTEND_ORIGIN',
  'Implement API client matching docs/API.md',
  'Port shared/browser-verifier.js verification into React',
  'Pin institution public key (get it from me out of band)',
  'Test against fixtures/proof-vectors.json',
  'Build login, publish, view, QR verify, correction, and audit pages',
  'Push to origin frontend; pull origin backend/h8-core before each session',
];
for (const item of checklist) {
  const { page: np, y: ny } = ensureSpace(page, y, 30);
  page = np; y = ny;
  page.drawText('[ ]', { x: marginX, y, size: fontSize, font });
  page.drawText(item, { x: marginX + 20, y, size: fontSize, font });
  y -= lineHeight;
}
y -= 10;

// Footer
const { page: pf, y: yf } = ensureSpace(page, y, 40);
page = pf; y = yf;
page.drawLine({
  start: { x: marginX, y: y + 4 },
  end: { x: pageWidth - marginX, y: y + 4 },
  thickness: 1,
  color: rgb(0.7, 0.7, 0.7),
});
page.drawText('VeriMark Frontend Partner Prompt - Generated from docs/FRONTEND_PARTNER_PROMPT.md', {
  x: marginX, y: y - 10, size: 8, font, color: rgb(0.5, 0.5, 0.5),
});

const pdfBytes = await pdf.save();
writeFileSync('Frontend_Partner_Prompt.pdf', pdfBytes);
console.log('PDF created: Frontend_Partner_Prompt.pdf');
console.log('Pages:', pdf.getPageCount());