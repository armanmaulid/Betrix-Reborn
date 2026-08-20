import nodemailer from 'nodemailer';
import { AppError } from '@betrix/core';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class SmtpEmailService {
  private transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(options: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
    from?: string;
  }) {
    if (!options.user || !options.pass) {
      throw new AppError('SMTP credentials (SMTP_USER and SMTP_PASS) are required for SmtpEmailService.', 500);
    }

    this.from = options.from || 'Betrix <no-reply@betrix.io>';
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.port === 465,
      auth: {
        user: options.user,
        pass: options.pass
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });
      return true;
    } catch (err: any) {
      console.error(`[SmtpEmailService] Failed to send email to ${options.to}:`, err.message);
      throw new AppError(`Failed to send email: ${err.message}`, 500);
    }
  }

  async sendVerificationEmail(to: string, verificationLink: string, name?: string): Promise<boolean> {
    const subject = 'Verify your Betrix Account';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">Welcome to Betrix${name ? `, ${name}` : ''}!</h2>
        <p style="color: #475569; font-size: 16px;">Please verify your email address to activate all platform features.</p>
        <div style="margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">If you did not create an account, you can safely ignore this email.</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
    const subject = 'Reset your Betrix Password';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">Password Reset Request</h2>
        <p style="color: #475569; font-size: 16px;">We received a request to reset your password. Click the button below to proceed.</p>
        <div style="margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">This link will expire in 1 hour. If you did not request this, ignore this email.</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }
}
