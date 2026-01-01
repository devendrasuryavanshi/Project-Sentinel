import { Queue, Worker, Job } from "bullmq";
import nodemailer from "nodemailer";
import { EnvConfig } from "../config/env.config";
import redis from "../database/redis.connection";

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

export const EmailQueue = new Queue("email-queue", {
  connection: redis,
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: EnvConfig.EMAIL_USER, pass: EnvConfig.EMAIL_PASS },
});

// Initialize Worker
new Worker(
  "email-queue",
  async (job: Job<EmailJobData>) => {
    const { to, subject, html } = job.data;
    await transporter.sendMail({
      from: `"Sentinel Security" <${EnvConfig.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  },
  { connection: redis }
);

/**
 * Adds an email job to the email queue.
 * The email will be sent in the background using BullMQ.
 * If the job fails, it will be retried up to 3 times with a fixed delay of 5 seconds.
 * Successfully completed jobs will be removed from the queue.
 * Failed jobs will be kept for 50 attempts before being removed from the queue.
 * @param to - The recipient's email address.
 * @param subject - The subject of the email.
 * @param html - The HTML content of the email.
 * @returns A promise that resolves when the job is added to the queue.
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  await EmailQueue.add(
    "email-job",
    { to, subject, html },
    {
      attempts: 3,
      backoff: { type: "fixed", delay: 5000 },
      removeOnComplete: true, // do not persist successful jobs
      removeOnFail: 50, // keep a short history of failures
    }
  );
};
