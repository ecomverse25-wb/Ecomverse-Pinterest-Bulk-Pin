import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Terms of Service - PinVerse",
    description: "Terms of Service for PinVerse Pinterest marketing tools.",
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#0F172A]">
            {/* Header */}
            <nav className="border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl font-black text-white">Pin</span>
                        <span className="text-xl font-black text-yellow-400">Verse</span>
                    </Link>
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
                <p className="text-slate-500 mb-8">Last updated: January 2025</p>

                <div className="prose prose-invert prose-slate max-w-none">
                    <div className="space-y-8 text-slate-300">

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">1. Agreement to Terms</h2>
                            <p>By accessing or using PinVerse (&quot;Service&quot;), operated by Ecomverse LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these terms, you do not have permission to access the Service.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
                            <p>PinVerse provides Pinterest marketing automation tools, including but not limited to:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Bulk pin creation with AI-generated content</li>
                                <li>Image generation and editing tools</li>
                                <li>CSV export functionality for Pinterest scheduling</li>
                                <li>Content scheduling and management features</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts</h2>
                            <p>When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms.</p>
                            <p className="mt-4">You are responsible for:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Maintaining the confidentiality of your account and password</li>
                                <li>Restricting access to your computer and account</li>
                                <li>All activities that occur under your account</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">4. API Keys and Third-Party Services</h2>
                            <p>Our Service may require you to provide your own API keys for third-party services (e.g., Google Gemini, Replicate, ImgBB). You are responsible for:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Obtaining and maintaining valid API keys</li>
                                <li>Complying with the terms of service of those third-party providers</li>
                                <li>Any costs associated with your API usage</li>
                                <li>Keeping your API keys secure and confidential</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">5. Subscription and Billing</h2>
                            <p>Some features of our Service are billed on a subscription basis (&quot;Subscription(s)&quot;). You will be billed in advance on a recurring basis (&quot;Billing Cycle&quot;), either monthly or annually, depending on the plan you select.</p>
                            <p className="mt-4">Your subscription will automatically renew unless you cancel it at least 24 hours before the end of the current Billing Cycle.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">6. Acceptable Use</h2>
                            <p>You agree not to use the Service to:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Violate any laws or regulations</li>
                                <li>Infringe upon the rights of others</li>
                                <li>Create spam or engage in deceptive practices</li>
                                <li>Distribute malware or harmful content</li>
                                <li>Attempt to gain unauthorized access to our systems</li>
                                <li>Violate Pinterest&apos;s Terms of Service or Community Guidelines</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">7. Intellectual Property</h2>
                            <p>The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Ecomverse LLC. Content you create using our tools remains your property, subject to applicable licensing.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">8. Limitation of Liability</h2>
                            <p>In no event shall Ecomverse LLC, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">9. Disclaimer</h2>
                            <p>Your use of the Service is at your sole risk. The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. The Service is provided without warranties of any kind, whether express or implied.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">10. Changes to Terms</h2>
                            <p>We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days&apos; notice prior to any new terms taking effect.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">11. Contact Us</h2>
                            <p>If you have any questions about these Terms, please contact us:</p>
                            <ul className="list-none mt-4 space-y-2">
                                <li><strong>Email:</strong> support@pinverse.io</li>
                                <li><strong>Company:</strong> Ecomverse LLC</li>
                            </ul>
                        </section>

                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-8">
                <div className="max-w-4xl mx-auto px-6 text-center text-slate-500 text-sm">
                    © 2025 Ecomverse LLC. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
