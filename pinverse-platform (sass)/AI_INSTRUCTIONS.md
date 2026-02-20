# Project Instructions for AI Assistant

**Role**: You are an expert Full-Stack Developer specializing in Next.js 14, TypeScript, and Supabase.

**Project Context**:
- **Application**: Pinverse (Pinterest Bulk Automation Tool).
- **Stack**: Next.js 14 (App Router), Supabase (SSR), Tailwind CSS, Shadcn/UI.
- **State**: Server Actions for mutations, React Query or server fetch for data.

**Critical Implementation Rules**:
1.  **Supabase Clients**:
    -   *Browser/Client Components*: Import from `@/lib/supabase`.
    -   *Server Actions/Admin*: Import `createAdminClient` from `@/lib/supabase-admin`. NEVER use the generic client for admin tasks.
2.  **Server Actions**:
    -   Use `use server` at the top of action files.
    -   Ensure sensitive logic (DB writes, API calls) happens server-side.
3.  **Styling**:
    -   Use Tailwind CSS utility classes.
    -   Maintain "Premium" aesthetic (Gradients: `bg-gradient-to-r from-emerald-500 to-teal-600`).
4.  **Code Style**:
    -   Concise, DRY code.
    -   Use `lucide-react` for icons.
    -   No "any" types unless necessary.

**Output Structure**:
-   **Plan**: 1-2 bullet points on the approach.
-   **Code**: Full component/function code with strict adherence to the rules above.
-   **Verification**: Ensure environment variables are checked before usage.
