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
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.config = {
      smtpServer: process.env.SMTP_SERVER || 'smtp.yandex.ru',
      senderEmail: process.env.SENDER_EMAIL || '',
      senderPassword: process.env.SENDER_PASSWORD || '',
      senderName: process.env.SENDER_NAME || 'Hackload Hackathon',
      port: parseInt(process.env.SMTP_PORT || '465')
    };

    // Only initialize transporter if we have valid config
    if (this.config.senderEmail && this.config.senderPassword) {
      this.isConfigured = true;
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
    } else {
      console.warn('Email service not configured: SENDER_EMAIL and SENDER_PASSWORD environment variables are missing');
    }
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
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured, skipping email send');
      return false;
    }

    try {
      const htmlContent = this.getDefaultHtmlTemplate(body);
      
      // Check if we're in production environment
      const isProduction = process.env.NODE_ENV === 'production';
      const defaultTestEmail = process.env.DEFAULT_TEST_EMAIL || 'test@hackload.kz';
      
      // In non-production, send all emails to default test email
      const actualRecipient = isProduction ? recipient : defaultTestEmail;
      
      // Modify subject to indicate original recipient in non-production
      const actualSubject = isProduction ? subject : `[TEST for ${recipient}] ${subject}`;
      
      const mailOptions = {
        from: `${this.config.senderName} <${this.config.senderEmail}>`,
        to: actualRecipient,
        subject: actualSubject,
        html: htmlContent
      };

      await this.transporter.sendMail(mailOptions);
      
      // Log email sent with both original and actual recipient
      console.log(`[EMAIL SENT] ${new Date().toISOString()} | Original: ${recipient} | Actual: ${actualRecipient} | Subject: ${actualSubject}`);
      
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendHtmlEmail(recipient: string, subject: string, htmlBody: string): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured, skipping HTML email send');
      return false;
    }

    try {
      const htmlContent = this.getDefaultHtmlTemplate(htmlBody);
      
      // Check if we're in production environment
      const isProduction = process.env.NODE_ENV === 'production';
      const defaultTestEmail = process.env.DEFAULT_TEST_EMAIL || 'test@hackload.kz';
      
      // In non-production, send all emails to default test email
      const actualRecipient = isProduction ? recipient : defaultTestEmail;
      
      // Modify subject to indicate original recipient in non-production
      const actualSubject = isProduction ? subject : `[TEST for ${recipient}] ${subject}`;
      
      const mailOptions = {
        from: `${this.config.senderName} <${this.config.senderEmail}>`,
        to: actualRecipient,
        subject: actualSubject,
        html: htmlContent
      };

      await this.transporter.sendMail(mailOptions);
      
      // Log email sent with both original and actual recipient
      console.log(`[EMAIL SENT HTML] ${new Date().toISOString()} | Original: ${recipient} | Actual: ${actualRecipient} | Subject: ${actualSubject}`);
      
      return true;
    } catch (error) {
      console.error('HTML email sending failed:', error);
      return false;
    }
  }

  async sendWelcomeEmail(recipient: string, participantName: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('Email service not configured, skipping welcome email');
      return false;
    }

    const subject = 'Добро пожаловать в Hackload Hackathon 2025!';
    const body = `
      <h2>Добро пожаловать, ${participantName}! 🎉</h2>
      <p>Мы рады приветствовать вас в <strong>Hackload Hackathon 2025</strong>!</p>
      <p>Вот что вы можете сделать дальше:</p>
      <ul>
        <li>📝 Заполните ваш профиль участника</li>
        <li>👥 Найдите команду или создайте собственную</li>
        <li>📅 Ознакомьтесь с расписанием мероприятия</li>
        <li>📋 Изучите правила и рекомендации хакатона</li>
      </ul>
      <p>Перейдите в вашу панель управления, чтобы начать:</p>
      <p style="text-align: center; margin: 20px 0;">
        <a href="https://hub.hackload.kz/space" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          🚀 Перейти в панель управления
        </a>
      </p>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Удачи в хакатоне! Мы уверены, что у вас все получится! 💪
      </p>
    `;
    
    return this.sendEmail(recipient, subject, body);
  }

  async sendTeamInvitation(recipient: string, teamName: string, inviterName: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('Email service not configured, skipping team invitation email');
      return false;
    }

    const subject = `Приглашение в команду: "${teamName}"`;
    const body = `
      <h2>Вас пригласили в команду! 🎯</h2>
      <p><strong>${inviterName}</strong> приглашает вас присоединиться к команде <strong>"${teamName}"</strong> для участия в Hackload Hackathon 2025.</p>
      <p>Чтобы принять или отклонить это приглашение, перейдите в вашу панель управления:</p>
      <p style="text-align: center; margin: 20px 0;">
        <a href="https://hub.hackload.kz/space/team" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          👀 Просмотреть приглашение
        </a>
      </p>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        💡 Не упустите возможность стать частью отличной команды!
      </p>
    `;
    
    return this.sendEmail(recipient, subject, body);
  }
}

export const emailService = new EmailService();