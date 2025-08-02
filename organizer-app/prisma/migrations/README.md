# Database Migrations

This directory contains all database migrations for the HackLoad Organizer application.

## Recent Migrations

### 20250802093301_add_run_number_and_k6_test_name

**Purpose**: Add K6 load testing functionality to TestRun model

**Changes**:
- Added `runNumber` field: Global sequential run number across all test runs (unique)
- Added `k6TestName` field: Name of the K6 TestRun resource in Kubernetes (nullable)

**Impact**:
- Enables tracking of test run numbers across all teams and scenarios
- Supports K6 operator integration for load testing
- UI can display test run numbers (#1, #2, #3, etc.)

**SQL Changes**:
```sql
ALTER TABLE "test_runs" ADD COLUMN "k6TestName" TEXT;
ALTER TABLE "test_runs" ADD COLUMN "runNumber" INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX "test_runs_runNumber_key" ON "test_runs"("runNumber");
```

**Rollback**: Use `rollback.sql` in the migration directory if needed (will lose data)

## Migration Commands

### Development
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply pending migrations
npx prisma migrate dev

# Reset database (dev only)
npx prisma migrate reset
```

### Production
```bash
# Apply migrations in production
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

### Utilities
```bash
# Generate Prisma Client
npx prisma generate

# Sync schema without migration (dev only)
npx prisma db push

# View database in browser
npx prisma studio
```

## Best Practices

1. **Always backup production** before running migrations
2. **Test migrations locally** first
3. **Review migration SQL** before applying
4. **Use descriptive migration names** 
5. **Keep migrations atomic** - one logical change per migration
6. **Never edit existing migrations** - create new ones instead

## K6 Integration Notes

The new fields support the K6 load testing workflow:

1. **runNumber**: Auto-incremented global counter
   - Used in K6 TestRun naming: `{teamId}-{scenarioId}-{runNumber}`
   - Displayed in UI as `#5`, `#10`, etc.

2. **k6TestName**: Links database record to K6 resource
   - Format: `team-abc123-scenario-def456-5`
   - Used for stopping/managing K6 tests
   - Null for non-K6 test runs

## Troubleshooting

**Migration conflicts**: 
```bash
npx prisma migrate resolve --applied <migration_name>
```

**Schema drift**:
```bash
npx prisma db pull  # Import current DB schema
npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel prisma/schema.prisma --script
```

**Reset everything** (dev only):
```bash
npx prisma migrate reset --force
```