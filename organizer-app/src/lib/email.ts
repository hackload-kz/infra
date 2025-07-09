import nodemailer from 'nodemailer';

interface EmailConfig {
  smtpServer: string;
  senderEmail: string;
  senderPassword: string;
  senderName: string;
  port: number;
}

class EmailService {
  private config: EmailConfig;
  private transporter: nodemailer.Transporter;

  constructor() {
    this.config = {
      smtpServer: process.env.SMTP_SERVER || 'smtp.yandex.ru',
      senderEmail: process.env.SENDER_EMAIL || '',
      senderPassword: process.env.SENDER_PASSWORD || '',
      senderName: process.env.SENDER_NAME || 'Hackload Hackathon',
      port: parseInt(process.env.SMTP_PORT || '465')
    };

    if (!this.config.senderEmail || !this.config.senderPassword) {
      throw new Error('SENDER_EMAIL and SENDER_PASSWORD environment variables are required');
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.smtpServer,
      port: this.config.port,
      secure: true, // SSL
      auth: {
        user: this.config.senderEmail,
        pass: this.config.senderPassword
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  private getDefaultHtmlTemplate(body: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hackload Hackathon</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }
        .header h1 {
            color: #2563eb;
            margin: 0;
            font-size: 28px;
        }
        .content {
            margin-bottom: 30px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
        }
        a {
            color: #2563eb;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Hackload Hackathon</h1>
        </div>
        <div class="content">
            ${body}
        </div>
        <div class="footer">
            <p>
            Команда <strong>Hackload</strong></p>
            <p>
                <a href="https://hub.hackload.kz">hub.hackload.kz</a>
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  async sendEmail(recipient: string, subject: string, body: string): Promise<boolean> {
    try {
      const htmlContent = this.getDefaultHtmlTemplate(body);
      
      const mailOptions = {
        from: `${this.config.senderName} <${this.config.senderEmail}>`,
        to: recipient,
        subject: subject,
        html: htmlContent
      };

      await this.transporter.sendMail(mailOptions);
      
      // Log email sent
      console.log(`[EMAIL SENT] ${new Date().toISOString()} | To: ${recipient} | Subject: ${subject}`);
      
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendWelcomeEmail(recipient: string, participantName: string): Promise<boolean> {
    const subject = 'Welcome to Hackload Hackathon 2025!';
    const body = `
      <h2>Welcome, ${participantName}!</h2>
      <p>We're excited to have you join <strong>Hackload Hackathon 2025</strong>!</p>
      <p>Here's what you can do next:</p>
      <ul>
        <li>Complete your participant profile</li>
        <li>Browse and join teams</li>
        <li>Check the event schedule</li>
        <li>Read the hackathon rules and guidelines</li>
      </ul>
      <p>Visit your participant dashboard to get started:</p>
      <p style="text-align: center; margin: 20px 0;">
        <a href="https://hub.hackload.kz/space" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          Go to Dashboard
        </a>
      </p>
    `;
    
    return this.sendEmail(recipient, subject, body);
  }

  async sendTeamInvitation(recipient: string, teamName: string, inviterName: string): Promise<boolean> {
    const subject = `Team Invitation: Join "${teamName}"`;
    const body = `
      <h2>You've been invited to join a team!</h2>
      <p><strong>${inviterName}</strong> has invited you to join their team <strong>"${teamName}"</strong> for Hackload Hackathon 2025.</p>
      <p>To accept or decline this invitation, please visit your dashboard:</p>
      <p style="text-align: center; margin: 20px 0;">
        <a href="https://hub.hackload.kz/space/team" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          View Invitation
        </a>
      </p>
    `;
    
    return this.sendEmail(recipient, subject, body);
  }
}

export const emailService = new EmailService();