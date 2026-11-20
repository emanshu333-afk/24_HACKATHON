/** VeriMark v1 HTTP shapes. Runtime verification is still mandatory for untrusted JSON. */
export type UUID = string;
export type Role = 'ADMIN' | 'STUDENT' | 'APPROVER' | 'AUDITOR';
export interface User { id: UUID; email: string; role: Role }
export interface Me extends User { studentId: UUID | null }
export interface LoginRequest { email: string; password: string }
export interface LoginResponse { token: string; expiresIn: number; user: User }
export interface Student { id: UUID; code: string; name: string }
export interface Examination { id: UUID; code: string; title: string }
export interface Mark { subject: string; score: number; max: 100 }
export type Marks = Mark[];
export interface PublishRequest { studentId: UUID; examId: UUID; marks: Marks }
export interface ResultRecord extends PublishRequest { id: UUID; currentVersion: number }
export interface ResultListItem extends ResultRecord { exam: Examination }
export interface PublishedData extends PublishRequest { format: 'verimark-v1'; resultId: UUID; version: number }
export interface Signed<T> { body: T; signature: string }
export interface ReceiptBody { format: 'verimark-v1'; resultId: UUID; version: number; commitment: string; eventHash: string; signer: string }
export type ResultReceipt = Signed<ReceiptBody>;
export interface CheckpointBody { format: 'verimark-v1'; sequence: number; headHash: string; signer: string; issuedAt: string }
export type CheckpointEvidence = Signed<CheckpointBody>;
export interface ProposalBody { format: 'verimark-v1'; id: UUID; resultId: UUID; baseVersion: number; marks: Marks; reason: string; createdAt: string }
export interface ApproverCertificate { format: 'verimark-v1'; userId: UUID; role: 'APPROVER'; keyId: string; publicKey: string }
export interface SignedApproval { certificate: Signed<ApproverCertificate>; signature: string }
export interface CorrectionEvidence { proposal: ProposalBody; approvals: SignedApproval[] }
export interface EventBody { format: 'verimark-v1'; id: UUID; sequence: number; type: 'PUBLISH' | 'CORRECT'; resultId: UUID; version: number; data: PublishedData; commitment: string; previousHash: string; signer: string; issuedAt: string; correction: CorrectionEvidence | null }
export interface LedgerEvent { body: EventBody; hash: string; signature: string }
export interface StoredLedgerEvent extends LedgerEvent { id: UUID; sequence: number; versionId: UUID }
export interface VerificationEvidence { events: LedgerEvent[]; checkpoint: CheckpointEvidence | null }
export interface PublicationResponse { resultId: UUID; version: number; receipt: ResultReceipt; checkpoint: CheckpointEvidence }
export interface ReceiptResponse { receipt: ResultReceipt; verificationUrl: string }
export interface CorrectionRequest { baseVersion: number; marks: Marks; reason: string }
export interface ApprovalRequest { signature: string }
export interface ApprovalRecord { id: UUID; proposalId: UUID; userId: UUID; signature: string }
export interface CorrectionProposal { id: UUID; resultId: UUID; baseVersion: number; body: ProposalBody; digest: string; applied: boolean }
export interface CorrectionDetails extends CorrectionProposal { approvals: ApprovalRecord[] }
export type ApprovalResponse = { proposalId: UUID; approvalCount: 1; applied: false } | (PublicationResponse & { proposalId: UUID; approvalCount: 2; applied: true });
export interface HistoricalVersion { id: UUID; resultId: UUID; version: number; data: PublishedData; commitment: string; event: StoredLedgerEvent | null }
export type CorrectionHistory = HistoricalVersion[];
export interface Failure { code: string; eventId?: UUID; sequence?: number; resultId?: UUID; version?: number }
export type VerificationStatus = 'VALID_CURRENT' | 'VALID_HISTORICAL' | 'INVALID' | 'INCOMPLETE';
export interface Verification { status: VerificationStatus; failures: Failure[]; checkpointSequence?: number; freshness?: 'UNWITNESSED' | 'AT_LEAST_WITNESSED_CHECKPOINT'; currentAsOf?: string; result?: PublishedData; latestVersion?: number }
export interface VerificationResponse { verification: Verification; evidence: VerificationEvidence }
export interface InvalidReceiptResponse { verification: Verification /* no evidence on HTTP 400 */ }
export interface IntegrityAuditFinding extends Failure { proposalId?: UUID; userId?: UUID; field?: string; expected?: unknown; actual?: unknown; expectedPresent?: boolean; actualPresent?: boolean }
export interface IntegrityAudit { status: 'VALID' | 'INVALID'; findings: IntegrityAuditFinding[]; freshness?: Verification['freshness']; checkpointSequence?: number }
export interface ApiError { error: string; issues?: Array<{ path: (string | number)[]; message: string }> }
export interface LedgerPage { events: LedgerEvent[]; nextAfter: number | null }
export interface VerifyOptions { receipt?: ResultReceipt; witness?: CheckpointEvidence }
export type BrowserVerifier = (evidence: VerificationEvidence, independentlyPinnedPublicKey: string, options?: VerifyOptions) => Promise<Verification>;
