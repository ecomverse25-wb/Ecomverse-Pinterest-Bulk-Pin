import { Star } from "lucide-react";

export interface TestimonialItem {
    quote: string;
    author: string;
    role: string;
    initial: string; // The letter in the avatar
    color?: 'yellow' | 'emerald' | 'purple';
}

export interface TestimonialsContent {
    title?: string;
    items?: TestimonialItem[];
}

const defaultItems: TestimonialItem[] = [
    {
        quote: "PinVerse saved me hours every week. I can now create a month's worth of pins in under an hour!",
        author: "Sarah M.",
        role: "Food Blogger",
        initial: "S",
        color: "yellow"
    },
    {
        quote: "The AI-generated content is surprisingly good. My Pinterest traffic has grown 300% since I started using PinVerse.",
        author: "Michael R.",
        role: "E-commerce Owner",
        initial: "M",
        color: "emerald"
    },
    {
        quote: "Finally, a Pinterest tool that actually works! The bulk creation feature is a game-changer for my agency.",
        author: "Jessica L.",
        role: "Marketing Agency",
        initial: "J",
        color: "purple"
    }
];

const defaultContent: TestimonialsContent = {
    title: "Loved by Pinterest Marketers",
    items: defaultItems
};

export default function Testimonials({ content }: { content?: TestimonialsContent | null }) {
    const { title, items } = { ...defaultContent, ...content };
    const list = items || defaultItems;

    const getColorClasses = (color?: string) => {
        switch (color) {
            case 'yellow': return { bg: 'bg-yellow-400/20', text: 'text-yellow-400' };
            case 'emerald': return { bg: 'bg-emerald-400/20', text: 'text-emerald-400' };
            case 'purple': return { bg: 'bg-purple-400/20', text: 'text-purple-400' };
            default: return { bg: 'bg-yellow-400/20', text: 'text-yellow-400' };
        }
    };

    return (
        <section className="py-20 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">{title}</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {list.map((item, i) => {
                        const style = getColorClasses(item.color);
                        return (
                            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                                <div className="flex gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map(star => <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                                </div>
                                <p className="text-slate-300 mb-4">&quot;{item.quote}&quot;</p>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 ${style.bg} rounded-full flex items-center justify-center ${style.text} font-bold`}>
                                        {item.initial}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{item.author}</p>
                                        <p className="text-slate-500 text-sm">{item.role}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
