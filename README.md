# Pick'em Backend

A Node.js backend for managing NFL pick'em games with Supabase and Drizzle ORM.

## Local Development

### Prerequisites
- Node.js 22+
- pnpm
- Supabase CLI

### Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Start Supabase locally**
   ```bash
   supabase start
   ```

3. **Reset database with migrations and seed data**
   ```bash
   supabase db reset
   ```
   This will:
   - Apply all migrations from `supabase/migrations/`
   - Seed the database with data from `supabase/seed.sql`
   - Automatically handle the migration state

### Database Management

**Important**: Don't use `pnpm db:migrate` locally! Supabase handles migrations automatically.

- **Generate new migrations**: `pnpm db:generate`
- **Apply changes**: `supabase db reset` (rebuilds everything)
- **Push changes**: `supabase db push` (applies without full reset)

### Development Workflow

1. Make schema changes in `src/database/db.schema.ts`
2. Generate migration: `pnpm db:generate`
3. Reset database: `supabase db reset`
4. Test your changes

### Production

Migrations are automatically applied to production when you push to the `main` branch via the CI/CD pipeline.

### Seed Data

Seed data is stored in `supabase/seed.sql`. If you need to update seed data:

1. Edit the `supabase/seed.sql` file directly
2. Reset database: `supabase db reset`