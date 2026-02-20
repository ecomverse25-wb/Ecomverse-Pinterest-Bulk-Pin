"use server";

import { createClient } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/admin";

export async function checkEnvVarsAction() {
    // Basic admin check (reusing logic that doesn't depend on Service Role)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Just check email list, don't crash if checking db fails
    const userEmail = user?.email?.toLowerCase() || "";
    // We already know fallback list works in middleware/lib
    // But safely re-check here
    const hardcodedAdmins = ['admin@pinverse.com', 'admin@pinverse.io', 'ecomverse25@gmail.com'];
    if (!user || (!hardcodedAdmins.includes(userEmail) && !isAdmin(user.email))) {
        throw new Error("Unauthorized");
    }

    // Check specific variables
    const checkVar = (key: string) => {
        const val = process.env[key];
        return {
            exists: !!val,
            length: val ? val.length : 0,
            start: val ? val.substring(0, 5) : null
        };
    };

    return {
        "NEXT_PUBLIC_SUPABASE_URL": checkVar("NEXT_PUBLIC_SUPABASE_URL"),
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": checkVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
        "SUPABASE_SERVICE_ROLE_KEY": checkVar("SUPABASE_SERVICE_ROLE_KEY"),
        "ADMIN_EMAILS": checkVar("ADMIN_EMAILS"),
        "NODE_ENV": checkVar("NODE_ENV"),
    };
}
