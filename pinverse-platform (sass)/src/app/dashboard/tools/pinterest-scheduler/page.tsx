import { Metadata } from "next";
import SchedulerTool from "@/components/scheduler/SchedulerTool";

export const metadata: Metadata = {
    title: "Pinterest Scheduler | PinVerse",
    description: "Automate your Pinterest workflow with smart scheduling.",
};

export default function SchedulerPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
                    Pinterest Scheduler
                </h1>
                <p className="text-muted-foreground mt-2">
                    Manage your upcoming pins and automate publishing for maximum reach.
                </p>
            </div>

            <SchedulerTool />
        </div>
    );
}
