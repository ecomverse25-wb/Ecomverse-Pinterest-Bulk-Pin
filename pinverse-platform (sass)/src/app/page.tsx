import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Shield, Users, Check, Star } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center">
              <span className="text-2xl font-black text-white">Pin</span>
              <span className="text-2xl font-black text-yellow-400">Verse</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-slate-300 hover:text-white transition">Features</Link>
            <Link href="#tools" className="text-slate-300 hover:text-white transition">Tools</Link>
            <Link href="#pricing" className="text-slate-300 hover:text-white transition">Pricing</Link>
            <Link href="/login" className="text-slate-300 hover:text-white transition">Login</Link>
            <Link href="/signup" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-2 mb-8">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400 font-medium">AI-Powered Pinterest Tools</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
            Dominate Pinterest<br />
            <span className="text-yellow-400">Without the Guesswork</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Create stunning pins in bulk, schedule content automatically, and grow your Pinterest traffic with our suite of AI-powered marketing tools.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#tools" className="btn-secondary text-lg px-8 py-4">
              Explore Tools
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>7-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose PinVerse?</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Everything you need to scale your Pinterest presence and drive massive organic traffic.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-yellow-400/50 transition">
              <div className="w-14 h-14 bg-yellow-400/10 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI-Powered Content</h3>
              <p className="text-slate-400">Generate optimized pin titles, descriptions, and images using advanced AI. Save hours on content creation.</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-yellow-400/50 transition">
              <div className="w-14 h-14 bg-emerald-400/10 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Bulk Operations</h3>
              <p className="text-slate-400">Create and schedule hundreds of pins at once. Export directly to Pinterest with our CSV editor.</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-yellow-400/50 transition">
              <div className="w-14 h-14 bg-purple-400/10 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Built for Creators</h3>
              <p className="text-slate-400">Designed by Pinterest marketers, for Pinterest marketers. Tools that actually work.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Powerful Tools, One Platform</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Access all the tools you need to dominate Pinterest marketing.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Tool 1: Bulk Pin Creator */}
            <div className="group relative bg-gradient-to-br from-yellow-400/10 to-orange-400/10 border border-yellow-400/20 rounded-2xl p-8 hover:border-yellow-400/50 transition overflow-hidden">
              <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">AVAILABLE</div>
              <h3 className="text-2xl font-bold text-white mb-3">Bulk Pin Creator</h3>
              <p className="text-slate-400 mb-6">Generate hundreds of Pinterest pins with AI-powered titles, descriptions, and images. Export as CSV for bulk upload.</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> AI-generated content</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Batch image generation</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> CSV export with scheduling</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> ImgBB auto-upload</li>
              </ul>
            </div>

            {/* Tool 2: Coming Soon */}
            <div className="group relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 opacity-75">
              <div className="absolute top-4 right-4 bg-slate-600 text-white text-xs font-bold px-3 py-1 rounded-full">COMING SOON</div>
              <h3 className="text-2xl font-bold text-white mb-3">Pinterest Scheduler</h3>
              <p className="text-slate-400 mb-6">Schedule your pins for optimal posting times. Automate your Pinterest workflow with smart scheduling.</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Auto-scheduling</li>
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Best time analysis</li>
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Multi-board support</li>
              </ul>
            </div>

            {/* Tool 3: Coming Soon */}
            <div className="group relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 opacity-75">
              <div className="absolute top-4 right-4 bg-slate-600 text-white text-xs font-bold px-3 py-1 rounded-full">COMING SOON</div>
              <h3 className="text-2xl font-bold text-white mb-3">Keyword Research</h3>
              <p className="text-slate-400 mb-6">Find high-traffic Pinterest keywords to optimize your pins for maximum discoverability.</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Trending keywords</li>
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Competition analysis</li>
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> SEO suggestions</li>
              </ul>
            </div>

            {/* Tool 4: Coming Soon */}
            <div className="group relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 opacity-75">
              <div className="absolute top-4 right-4 bg-slate-600 text-white text-xs font-bold px-3 py-1 rounded-full">COMING SOON</div>
              <h3 className="text-2xl font-bold text-white mb-3">Analytics Dashboard</h3>
              <p className="text-slate-400 mb-6">Track your Pinterest performance with detailed analytics and insights.</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Pin performance</li>
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Traffic tracking</li>
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Growth metrics</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Choose the plan that fits your Pinterest marketing needs.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Trial */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-2">Free Trial</h3>
              <p className="text-slate-400 text-sm mb-6">Try all features for 7 days</p>
              <div className="mb-6">
                <span className="text-4xl font-black text-white">$0</span>
                <span className="text-slate-400">/7 days</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> All tools access</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> 10 pins limit</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Basic support</li>
              </ul>
              <Link href="/signup" className="block w-full btn-secondary text-center">Start Free Trial</Link>
            </div>

            {/* Starter */}
            <div className="bg-gradient-to-b from-yellow-400/10 to-transparent border-2 border-yellow-400 rounded-2xl p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 text-xs font-bold px-4 py-1 rounded-full">MOST POPULAR</div>
              <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
              <p className="text-slate-400 text-sm mb-6">For individual creators</p>
              <div className="mb-6">
                <span className="text-4xl font-black text-white">$29</span>
                <span className="text-slate-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> 2 tools access</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> 100 pins/month</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Priority support</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> CSV export</li>
              </ul>
              <Link href="/signup?plan=starter" className="block w-full btn-primary text-center">Get Started</Link>
            </div>

            {/* Pro */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
              <p className="text-slate-400 text-sm mb-6">For power users & agencies</p>
              <div className="mb-6">
                <span className="text-4xl font-black text-white">$59</span>
                <span className="text-slate-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> All tools access</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Unlimited pins</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Priority support</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Early access to new tools</li>
              </ul>
              <Link href="/signup?plan=pro" className="block w-full btn-accent text-center">Go Pro</Link>
            </div>
          </div>

          <p className="text-center text-slate-500 mt-8 text-sm">
            Are you an Ecomverse member? <Link href="/signup?coupon=ECOMVERSE100" className="text-yellow-400 hover:underline">Get free access here</Link>
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Loved by Pinterest Marketers</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-slate-300 mb-4">&quot;PinVerse saved me hours every week. I can now create a month&apos;s worth of pins in under an hour!&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center text-yellow-400 font-bold">S</div>
                <div>
                  <p className="text-white font-medium">Sarah M.</p>
                  <p className="text-slate-500 text-sm">Food Blogger</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-slate-300 mb-4">&quot;The AI-generated content is surprisingly good. My Pinterest traffic has grown 300% since I started using PinVerse.&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-400/20 rounded-full flex items-center justify-center text-emerald-400 font-bold">M</div>
                <div>
                  <p className="text-white font-medium">Michael R.</p>
                  <p className="text-slate-500 text-sm">E-commerce Owner</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-slate-300 mb-4">&quot;Finally, a Pinterest tool that actually works! The bulk creation feature is a game-changer for my agency.&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-400/20 rounded-full flex items-center justify-center text-purple-400 font-bold">J</div>
                <div>
                  <p className="text-white font-medium">Jessica L.</p>
                  <p className="text-slate-500 text-sm">Marketing Agency</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-yellow-400/10 to-emerald-400/10 border border-yellow-400/20 rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Dominate Pinterest?</h2>
          <p className="text-slate-400 mb-8">Start your free 7-day trial today. No credit card required.</p>
          <Link href="/signup" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2">
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl font-black text-white">Pin</span>
                <span className="text-xl font-black text-yellow-400">Verse</span>
              </div>
              <p className="text-slate-500 text-sm">Pinterest marketing tools for creators and businesses.</p>
              <p className="text-slate-600 text-xs mt-4">© 2025 Ecomverse LLC. All rights reserved.</p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="#features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="#tools" className="hover:text-white transition">Tools</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="https://ecomverse.study" className="hover:text-white transition">Ecomverse Academy</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link href="/refund-policy" className="hover:text-white transition">Refund Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
