import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Privacy Policy - PinVerse",
    description: "Privacy Policy for PinVerse Pinterest marketing tools.",
};

export default function PrivacyPage() {
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
                <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
                <p className="text-slate-500 mb-8">Last updated: January 2025</p>

                <div className="prose prose-invert prose-slate max-w-none">
                    <div className="space-y-8 text-slate-300">

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
                            <p>Ecomverse LLC (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates PinVerse (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>

                            <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.1 Personal Information</h3>
                            <p>When you register for an account, we may collect:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Email address</li>
                                <li>Payment information (processed by Stripe)</li>
                                <li>Account preferences and settings</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.2 Usage Data</h3>
                            <p>We automatically collect certain information when you use the Service:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Browser type and version</li>
                                <li>Device information</li>
                                <li>Pages visited and features used</li>
                                <li>Time and date of your visit</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.3 API Keys</h3>
                            <p>You may provide third-party API keys (Google Gemini, Replicate, ImgBB) to enable certain features. These keys are stored securely and only used to make API calls on your behalf.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
                            <p>We use the information we collect to:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Provide and maintain our Service</li>
                                <li>Process your transactions</li>
                                <li>Send you service-related communications</li>
                                <li>Respond to your inquiries and support requests</li>
                                <li>Improve our Service</li>
                                <li>Detect and prevent fraud or abuse</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">4. Third-Party Services</h2>
                            <p>Our Service integrates with the following third-party services:</p>

                            <div className="mt-4 space-y-4">
                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                    <h4 className="font-bold text-white">Supabase</h4>
                                    <p className="text-sm text-slate-400">Used for authentication and data storage. <a href="https://supabase.com/privacy" className="text-yellow-400 hover:underline">Privacy Policy</a></p>
                                </div>
                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                    <h4 className="font-bold text-white">Stripe</h4>
                                    <p className="text-sm text-slate-400">Used for payment processing. <a href="https://stripe.com/privacy" className="text-yellow-400 hover:underline">Privacy Policy</a></p>
                                </div>
                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                    <h4 className="font-bold text-white">Google (Gemini API)</h4>
                                    <p className="text-sm text-slate-400">Used for AI content generation (via your API key). <a href="https://policies.google.com/privacy" className="text-yellow-400 hover:underline">Privacy Policy</a></p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">5. Data Security</h2>
                            <p>We implement appropriate technical and organizational measures to protect your personal information, including:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Encryption of data in transit (HTTPS)</li>
                                <li>Secure storage with access controls</li>
                                <li>Regular security assessments</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">6. Your Rights</h2>
                            <p>Depending on your location, you may have the following rights:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li><strong>Access:</strong> Request a copy of your personal data</li>
                                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                                <li><strong>Portability:</strong> Request transfer of your data</li>
                                <li><strong>Opt-out:</strong> Opt out of marketing communications</li>
                            </ul>
                            <p className="mt-4">To exercise these rights, contact us at support@pinverse.io</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">7. Cookies</h2>
                            <p>We use essential cookies to maintain your session and preferences. We do not use tracking cookies for advertising purposes.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">8. Data Retention</h2>
                            <p>We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and data at any time.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">9. Children&apos;s Privacy</h2>
                            <p>Our Service is not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">10. Changes to This Policy</h2>
                            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">11. Contact Us</h2>
                            <p>If you have questions about this Privacy Policy, please contact us:</p>
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
