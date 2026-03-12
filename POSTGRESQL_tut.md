# PostgreSQL Setup on Arch Linux (AgentBranch Project)

This guide sets up a **local PostgreSQL database** for the AgentBranch backend.

Target connection:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentbranch
PORT=3001
```

---

# 1. Install PostgreSQL

Update packages and install PostgreSQL:

```bash
sudo pacman -Syu
sudo pacman -S postgresql
```

# 2. Initialize the PostgreSQL Database Cluster

Arch Linux requires manual initialization:

```bash
sudo -iu postgres initdb --locale=C.UTF-8 -D /var/lib/postgres/data
```

This creates the internal PostgreSQL storage directory.

# 3. Start PostgreSQL Service

Start and enable the database service:

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql
```

# 4. Access PostgreSQL Shell

Switch to the `postgres` system user and open the `psql` shell:

```bash
sudo -iu postgres
psql
```

You should see a prompt like:

```
postgres=#
```

# 5. Set Password for `postgres` User

Inside the PostgreSQL shell run:

```sql
ALTER USER postgres PASSWORD 'postgres';
```

# 6. Create the Project Database

Create the database for the project and verify:

```sql
CREATE DATABASE agentbranch;
\l
\q
```

# 7. Test the Connection

Run:

```bash
psql postgresql://postgres:postgres@localhost:5432/agentbranch
```

If the prompt opens successfully, the database is ready.

# 8. Environment Configuration

Create a `.env` file in the backend project with:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentbranch
PORT=3001
```

# 9. Verify Database Connection

Connect locally:

```bash
psql -U postgres -h localhost
```

Then, inside `psql`:

```
\c agentbranch
```

## Useful PostgreSQL Commands

```bash
sudo systemctl restart postgresql
sudo systemctl stop postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
```

## Reset PostgreSQL (Optional)

If the database becomes corrupted during development:

```bash
sudo systemctl stop postgresql
sudo rm -rf /var/lib/postgres/data
sudo -iu postgres initdb --locale=C.UTF-8 -D /var/lib/postgres/data
sudo systemctl start postgresql
```

You will then need to recreate the database and password.
