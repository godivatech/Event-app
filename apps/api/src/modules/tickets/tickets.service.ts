import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoUtil } from '../../common/crypto/crypto.util';
import { OutboxService } from '../jobs/outbox.service';
import {
  Prisma,
  TicketStatus,
  PdfArtifactStatus,
  OutboxJobType,
} from '@prisma/client';
import * as QRCode from 'qrcode';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  private readonly encryptionKey: string;
  private readonly storageDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService
  ) {
    this.encryptionKey =
      process.env.TICKET_ENCRYPTION_KEY ||
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    this.storageDir = process.env.PDF_STORAGE_DIR || './storage/pdfs';

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    // Register PDF generation handler with Outbox
    this.outboxService.registerHandler(
      OutboxJobType.PDF_GENERATION,
      async (payload: { bookingId: string }) => {
        await this.generatePdfForBooking(payload.bookingId);
      }
    );
  }

  /**
   * Atomically issues tickets for confirmed booking inside transaction.
   */
  async issueTicketsForBooking(
    tx: Prisma.TransactionClient,
    bookingId: string
  ): Promise<number> {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        items: {
          include: { ticketType: true },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found for ticket issuance');

    let totalCreated = 0;

    for (const item of booking.items) {
      for (let i = 1; i <= item.quantity; i++) {
        // Check if ticket already exists (idempotency constraint)
        const existing = await tx.ticket.findUnique({
          where: {
            bookingItemId_admissionIndex: {
              bookingItemId: item.id,
              admissionIndex: i,
            },
          },
        });

        if (existing) continue;

        const ticketNumber = CryptoUtil.generateTicketNumber();
        // Cryptographically secure 256-bit entropy QR token
        const rawQrToken = `CEDOI_QR_${CryptoUtil.generateSecureToken(32)}`;
        const qrCredentialHash = CryptoUtil.sha256(rawQrToken);
        const encryptedQrToken = CryptoUtil.encrypt(rawQrToken, this.encryptionKey);

        await tx.ticket.create({
          data: {
            bookingId: booking.id,
            bookingItemId: item.id,
            ticketTypeId: item.ticketTypeId,
            admissionIndex: i,
            ticketNumber,
            qrCredentialHash,
            encryptedQrToken,
            attendeeName: booking.customerName,
            attendeeEmail: booking.customerEmail,
            attendeePhone: booking.customerPhone,
            businessName: booking.businessName,
            location: booking.location,
            memberType: booking.memberType,
            foodPreference: booking.foodPreference,
            status: TicketStatus.ACTIVE,
          },
        });
        totalCreated++;
      }
    }

    // Upsert PDF artifact status
    await tx.pdfArtifact.upsert({
      where: { bookingId: booking.id },
      update: { status: PdfArtifactStatus.PENDING },
      create: {
        bookingId: booking.id,
        status: PdfArtifactStatus.PENDING,
      },
    });

    // Enqueue background PDF generation job in Outbox
    await this.outboxService.enqueueJob(
      OutboxJobType.PDF_GENERATION,
      { bookingId: booking.id },
      tx
    );

    return totalCreated;
  }

  /**
   * Generates a branded, multi-page PDF containing one scannable ticket per page.
   */
  async generatePdfForBooking(bookingId: string): Promise<string> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: true,
        tickets: {
          include: { ticketType: true },
          orderBy: { admissionIndex: 'asc' },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    await this.prisma.pdfArtifact.update({
      where: { bookingId: booking.id },
      data: { status: PdfArtifactStatus.PROCESSING },
    });

    try {
      const fileName = `CEDOI_${booking.bookingNumber}_Tickets.pdf`;
      const filePath = path.join(this.storageDir, fileName);

      await new Promise<void>(async (resolve, reject) => {
        const doc = new (PDFDocument as any)({
          size: 'A4',
          margin: 40,
          autoFirstPage: false,
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        for (let idx = 0; idx < booking.tickets.length; idx++) {
          const ticket = booking.tickets[idx];
          doc.addPage();

          // Recover decrypted QR token for scannable QR code
          let rawQrToken: string;
          try {
            rawQrToken = CryptoUtil.decrypt(ticket.encryptedQrToken, this.encryptionKey);
          } catch {
            rawQrToken = ticket.qrCredentialHash;
          }

          // Generate QR code buffer (high contrast, error correction level H)
          const qrPngBuffer = await QRCode.toBuffer(rawQrToken, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 200,
            color: {
              dark: '#031E2D',
              light: '#FFFFFF',
            },
          });

          // Draw Header with crisp white background & brand accent borders
          doc.rect(40, 40, 515, 80).fill('#FFFFFF');
          doc.rect(40, 40, 515, 5).fill('#08537B'); // CEDOI Teal Top Band
          doc.rect(40, 45, 515, 2).fill('#EE8518'); // CEDOI Orange Secondary Stripe
          doc.rect(40, 40, 515, 80).strokeColor('#CBD5E1').lineWidth(1).stroke();

          // Top Left: Official CEDOI Brand Logo (Placed on white background so brand teal & orange are 100% visible)
          const logoCandidates = [
            path.resolve(process.cwd(), 'apps/api/assets/Logo_tight.png'),
            path.resolve(process.cwd(), 'assets/Logo_tight.png'),
            path.resolve(__dirname, '../../../assets/Logo_tight.png'),
            path.resolve(__dirname, '../../../../assets/Logo_tight.png'),
            path.resolve(process.cwd(), 'apps/api/assets/Logo.png'),
            path.resolve(process.cwd(), 'assets/Logo.png'),
            path.resolve(process.cwd(), '../web/public/brand/logo_tight.png'),
            path.resolve(process.cwd(), '../web/public/brand/logo.png'),
            path.resolve(__dirname, '../../../assets/Logo.png'),
          ];
          const logoPath = logoCandidates.find((p) => fs.existsSync(p));
          if (logoPath) {
            try {
              doc.image(logoPath, 56, 52, { width: 155 });
            } catch {
              doc.fillColor('#08537B').fontSize(22).font('Helvetica-Bold').text('CEDOI', 56, 54);
              doc.fillColor('#EE8518').fontSize(9).font('Helvetica-Bold').text('BUILDING OUTSTANDING ENTREPRENEURS', 56, 80);
            }
          }

          doc.fillColor('#64748B').fontSize(8.5).font('Helvetica').text('Official Digital Event Admission Pass', 56, 99);

          // Top Right: Admission Badge & Verification Status
          doc.roundedRect(405, 54, 135, 26, 6).fill('#08537B');
          doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text('ADMISSION PASS', 405, 62, { align: 'center', width: 135 });

          doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Bold').text(`Pass #${ticket.admissionIndex} of ${booking.tickets.length}`, 405, 85, { align: 'center', width: 135 });
          doc.fillColor('#059669').fontSize(8).font('Helvetica-Bold').text('• VERIFIED ADMISSION', 405, 98, { align: 'center', width: 135 });

          // Card Body
          doc.rect(40, 120, 515, 620).strokeColor('#CBD5E1').lineWidth(1).stroke();

          // Event Title
          doc.fillColor('#0F172A').fontSize(18).font('Helvetica-Bold').text(booking.event.name, 60, 145, { width: 475 });

          // Venue & Date Info
          doc.fillColor('#475569').fontSize(11).font('Helvetica').text(`Venue: ${booking.event.venue}`, 60, 175, { width: 475 });
          doc.fontSize(10).text(`Address: ${booking.event.address}`, 60, 195, { width: 475 });

          const starts = new Date(booking.event.startsAt).toLocaleString('en-IN', {
            timeZone: booking.event.timezone,
            dateStyle: 'full',
            timeStyle: 'short',
          });
          doc.fillColor('#08537B').fontSize(11).font('Helvetica-Bold').text(`Date & Time: ${starts}`, 60, 225);

          // Divider
          doc.moveTo(60, 250).lineTo(535, 250).strokeColor('#E2E8F0').lineWidth(1).stroke();

          // Ticket Details Section
          doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('CATEGORY', 60, 265);
          doc.fillColor('#08537B').fontSize(13).font('Helvetica-Bold').text(ticket.ticketType.name, 60, 278);

          doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('ADMISSION TICKET NUMBER', 260, 265);
          doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text(ticket.ticketNumber, 260, 278);

          doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('BOOKING NUMBER', 430, 265);
          doc.fillColor('#0F172A').fontSize(11).font('Helvetica').text(booking.bookingNumber, 430, 278);

          // Row 2: Delegate Profile
          doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('ATTENDEE / BUYER', 60, 305);
          doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(ticket.attendeeName || booking.customerName, 60, 318);

          doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('BUSINESS / ORGANIZATION', 260, 305);
          doc.fillColor('#0F172A').fontSize(11).font('Helvetica').text(ticket.businessName || booking.businessName || 'Independent Delegate', 260, 318);

          doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('LOCATION / CITY', 430, 305);
          doc.fillColor('#0F172A').fontSize(11).font('Helvetica').text(ticket.location || booking.location || 'Madurai', 430, 318);

          // Row 3: Membership & Meal Badges
          const isMember = (ticket.memberType || booking.memberType) === 'MEMBER';
          const isVeg = (ticket.foodPreference || booking.foodPreference) === 'VEG';

          doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('MEMBERSHIP TYPE', 60, 345);
          doc.fillColor(isMember ? '#08537B' : '#475569').fontSize(11).font('Helvetica-Bold').text(isMember ? 'CEDOI MEMBER' : 'NON-MEMBER', 60, 358);

          doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('CATERING / MEAL', 260, 345);
          doc.fillColor(isVeg ? '#16A34A' : '#D97706').fontSize(11).font('Helvetica-Bold').text(isVeg ? 'PURE VEGETARIAN' : 'NON-VEGETARIAN', 260, 358);

          doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('ADMISSION ITEM', 430, 345);
          doc.fillColor('#EE8518').fontSize(11).font('Helvetica-Bold').text(`${ticket.admissionIndex} of ${booking.tickets.length}`, 430, 358);

          // Center QR Code
          doc.image(qrPngBuffer, 207, 395, { width: 180, height: 180 });

          doc.fillColor('#64748B').fontSize(9).font('Helvetica').text('Scan at assigned gate for single-entry admission & catering badge verification.', 60, 588, { align: 'center', width: 475 });

          // Entry Instructions and Terms
          doc.rect(60, 615, 475, 105).fill('#F8FAFC');
          doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text('ENTRY GUIDELINES & ORGANIZER TERMS:', 75, 625);
          doc.fillColor('#475569').fontSize(8).font('Helvetica').text(
            '1. Each ticket allows exactly one entry. Present this QR code on your mobile screen or printed on paper.\n' +
            '2. Possessing this QR allows admission only; it does not grant booking management permissions.\n' +
            '3. Please carry a valid government-issued photo ID matching the attendee.\n' +
            '4. Tickets are non-transferable and non-refundable once the event begins.',
            75,
            642,
            { width: 445, lineGap: 3 }
          );

          // Footer
          doc.fillColor('#94A3B8').fontSize(8).font('Helvetica').text(`Page ${idx + 1} of ${booking.tickets.length} — CEDOI Digital Ticketing System`, 40, 755, { align: 'center', width: 515 });
        }

        doc.end();
        stream.on('finish', () => resolve());
        stream.on('error', (err) => reject(err));
      });

      const stats = fs.statSync(filePath);

      await this.prisma.pdfArtifact.update({
        where: { bookingId: booking.id },
        data: {
          status: PdfArtifactStatus.READY,
          filePath,
          fileUrl: `/api/v1/tickets/${booking.bookingNumber}/pdf`,
          fileSizeBytes: stats.size,
          generatedAt: new Date(),
          errorMessage: null,
        },
      });

      this.logger.log(`Generated ticket PDF for booking ${booking.bookingNumber} (${stats.size} bytes).`);
      return filePath;
    } catch (err: any) {
      this.logger.error(`PDF generation failed for booking ${booking.bookingNumber}: ${err.message}`, err.stack);
      await this.prisma.pdfArtifact.update({
        where: { bookingId: booking.id },
        data: {
          status: PdfArtifactStatus.FAILED,
          errorMessage: err.message,
        },
      });
      throw err;
    }
  }

  async getPdfFilePath(bookingNumber: string): Promise<{ filePath: string; fileName: string }> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingNumber },
      include: { pdfArtifact: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!booking.pdfArtifact || booking.pdfArtifact.status !== PdfArtifactStatus.READY || !booking.pdfArtifact.filePath) {
      // Trigger synchronous generation if not yet ready
      await this.generatePdfForBooking(booking.id);
    }

    const updated = await this.prisma.pdfArtifact.findUnique({
      where: { bookingId: booking.id },
    });

    if (!updated || updated.status !== PdfArtifactStatus.READY || !updated.filePath || !fs.existsSync(updated.filePath)) {
      throw new NotFoundException('PDF ticket artifact is not ready yet. Please try again.');
    }

    return {
      filePath: updated.filePath,
      fileName: `CEDOI_${booking.bookingNumber}_Tickets.pdf`,
    };
  }
}
