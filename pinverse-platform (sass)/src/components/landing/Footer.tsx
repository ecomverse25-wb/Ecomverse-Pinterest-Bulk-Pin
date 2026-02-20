import Link from "next/link";

export interface LinkItem {
    label: string;
    href: string;
}

export interface FooterContent {
    brandNamePart1?: string;
    brandNamePart2?: string;
    description?: string;
    copyright?: string;
    productLinks?: LinkItem[];
    companyLinks?: LinkItem[];
    legalLinks?: LinkItem[];
}

const defaultContent: FooterContent = {
    brandNamePart1: "Pin",
    brandNamePart2: "Verse",
    description: "Pinterest marketing tools for creators and businesses.",
    copyright: "Ecomverse LLC. All rights reserved.",
    productLinks: [
        { label: "Features", href: "#features" },
        { label: "Tools", href: "#tools" },
        { label: "Pricing", href: "#pricing" }
    ],
    companyLinks: [
        { label: "Contact", href: "/contact" }
    ],
    legalLinks: [
        { label: "Terms of Service", href: "/terms" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Refund Policy", href: "/refund-policy" }
    ]
};

export default function Footer({ content }: { content?: FooterContent | null }) {
    const { brandNamePart1, brandNamePart2, description, copyright, productLinks, companyLinks, legalLinks } = { ...defaultContent, ...content };
    const currentYear = new Date().getFullYear();

    return (
        <footer className="py-12 px-6 border-t border-slate-800">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl font-black text-white">{brandNamePart1}</span>
                            <span className="text-xl font-black text-yellow-400">{brandNamePart2}</span>
                        </div>
                        <p className="text-slate-500 text-sm">{description}</p>
                        <p className="text-slate-600 text-xs mt-4">© {currentYear} {copyright}</p>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Product</h4>
                        <ul className="space-y-2 text-slate-400 text-sm">
                            {(productLinks || defaultContent.productLinks!).map((link, i) => (
                                <li key={i}><Link href={link.href} className="hover:text-white transition">{link.label}</Link></li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Company</h4>
                        <ul className="space-y-2 text-slate-400 text-sm">
                            {(companyLinks || defaultContent.companyLinks!).map((link, i) => (
                                <li key={i}><Link href={link.href} className="hover:text-white transition">{link.label}</Link></li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Legal</h4>
                        <ul className="space-y-2 text-slate-400 text-sm">
                            {(legalLinks || defaultContent.legalLinks!).map((link, i) => (
                                <li key={i}><Link href={link.href} className="hover:text-white transition">{link.label}</Link></li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
}
