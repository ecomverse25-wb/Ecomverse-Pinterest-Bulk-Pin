"use server";

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    },
});

export async function sendContactEmail(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;

    if (!name || !email || !subject || !message) {
        return { success: false, error: 'All fields are required' };
    }

    try {
        console.log("Attempting to send email via SMTP...");

        // Verify connection configuration
        // await transporter.verify(); // Optional: good for debugging startup, but might slow down request

        const info = await transporter.sendMail({
            from: `"PinVerse Support" <${process.env.SMTP_USER}>`, // sender address
            to: "ecomverse25@gmail.com", // list of receivers
            replyTo: email, // Reply to the customer
            subject: `[PinVerse Contact] ${subject} - ${name}`, // Subject line
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <blockquote style="background: #f4f4f5; padding: 10px; border-left: 4px solid #facc15;">
                    ${message.replace(/\n/g, '<br/>')}
                </blockquote>
            `,
        });

        console.log("SMTP Message sent: %s", info.messageId);
        return { success: true };

    } catch (error: any) {
        console.error('SMTP Email sending failed:', error);
        return { success: false, error: 'Failed to send message: ' + (error.message || 'Unknown error') };
    }
}
