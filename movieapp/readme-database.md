# Database Configuration

This project uses PostgreSQL for both local development and production (Render).

---

## Understanding the Setup

| Environment          | Database          | How It's Configured                               |
| -------------------- | ----------------- | ------------------------------------------------- |
| Local (your machine) | Local PostgreSQL  | `.env` file with `DB_HOST`, `DB_NAME`, etc. |
| Production (Render)  | Render PostgreSQL | `DATABASE_URL` environment variable             |

The backend automatically chooses the right database based on your `.env` configuration.

---

## Local Development

You have two options for running PostgreSQL locally:

⚠️Base it on the initial setup from README.md

### Option A: Docker (Recommended for Teams)

This runs PostgreSQL in a container

**1. Start the database:**

```bash
cd docker
docker compose -f compose.dev.yml up db
```

**2. Add to your `.env` file** in `movieapp/backend/`:

```env
# Docker PostgreSQL (matches compose.dev.yml)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=movieapp
DB_USER=movieapp
DB_PASSWORD=movieapp
```

**3. Run migrations and start server:**

```bash
cd movieapp/backend
python manage.py migrate
python manage.py runserver
```

> **Note:** The database only runs when Docker is running.

---

### Option B: Local PostgreSQL Installation

**1. Install pgAdmin4, create a server, and a database**

**2. Create your `.env` file** in `movieapp/backend/`:

```env
# Local PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=movieapp
DB_USER=movieapp
DB_PASSWORD=movieapp

# Django settings
DEBUG=true
```

**4. Run migrations and start server:**

```bash
cd movieapp/backend
python manage.py migrate
python manage.py runserver
```

---

## Production Database (Render)

The production database is hosted on Render.

### Connection Details

| Field              | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| **Host**     | `dpg-d45s9sre5dus73cciigg-a.frankfurt-postgres.render.com` |
| **Port**     | `5432`                                                     |
| **Database** | `render_db_qvd5`                                           |
| **Username** | `render_db_qvd5_user`                                      |
| **Password** | `HB0wcEoEn2VUfjj49wM48hDYTImke3ha`                         |

### Database URLs

**Internal URL** (only Render uses it):

```
postgresql://render_db_qvd5_user:HB0wcEoEn2VUfjj49wM48hDYTImke3ha@dpg-d45s9sre5dus73cciigg-a/render_db_qvd5
```

**External URL** (use on your local machine or pgAdmin):

```
postgresql://render_db_qvd5_user:HB0wcEoEn2VUfjj49wM48hDYTImke3ha@dpg-d45s9sre5dus73cciigg-a.frankfurt-postgres.render.com/render_db_qvd5
```

---

## Connecting pgAdmin to Databases

### Connect to Local Database

1. Open pgAdmin
2. Right-click **Servers** → **Register** → **Server**
3. **General tab:** Name: `Local`
4. **Connection tab:**
   - Host: `localhost`
   - Port: `5432`
   - Database: `movieapp`
   - Username: `movieapp`
   - Password: `movieapp`
5. Click **Save**

### Connect to Render Database

1. Open pgAdmin
2. Right-click **Servers** → **Register** → **Server**
3. **General tab:** Name: `Render Production`
4. **Connection tab:**
   - Host: `dpg-d45s9sre5dus73cciigg-a.frankfurt-postgres.render.com`
   - Port: `5432`
   - Database: `render_db_qvd5`
   - Username: `render_db_qvd5_user`
   - Password: `HB0wcEoEn2VUfjj49wM48hDYTImke3ha`
5. **SSL tab:** SSL mode: `Require`
6. Click **Save**

### Create tables and add content

1.Select the database in pgAdmin
2. Open Query Tool
3. Paste SQL commands to create tables and insert data

```bash
CREATE TABLE appuser (
	user_id	 BIGSERIAL NOT NULL,
	username VARCHAR(512) NOT NULL,
	email	 VARCHAR(512) NOT NULL,
	password VARCHAR(512) NOT NULL,
	is_admin BOOL NOT NULL DEFAULT FALSE,
	PRIMARY KEY(user_id)
);

CREATE TABLE movie (
	movie_id	 BIGSERIAL NOT NULL,
	title	 VARCHAR(512) NOT NULL,
	genre	 VARCHAR(512) NOT NULL,
	description VARCHAR(512) NOT NULL,
	PRIMARY KEY(movie_id)
);

CREATE TABLE rating (
	rating_id	 BIGSERIAL NOT NULL,
	score		 FLOAT(8) NOT NULL,
	created_at	 DATE NOT NULL,
	movie_movie_id	 BIGINT NOT NULL,
	appuser_user_id BIGINT NOT NULL,
	PRIMARY KEY(rating_id)
);

CREATE TABLE recommendation (
	rec_id		 BIGSERIAL NOT NULL,
	predicted_score FLOAT(8),
	movie_movie_id	 BIGINT NOT NULL,
	appuser_user_id BIGINT NOT NULL,
	PRIMARY KEY(rec_id)
);

ALTER TABLE appuser ADD UNIQUE (username, email);
ALTER TABLE rating ADD CONSTRAINT rating_fk1 FOREIGN KEY (movie_movie_id) REFERENCES movie(movie_id);
ALTER TABLE rating ADD CONSTRAINT rating_fk2 FOREIGN KEY (appuser_user_id) REFERENCES appuser(user_id);
ALTER TABLE recommendation ADD CONSTRAINT recommendation_fk1 FOREIGN KEY (movie_movie_id) REFERENCES movie(movie_id);
ALTER TABLE recommendation ADD CONSTRAINT recommendation_fk2 FOREIGN KEY (appuser_user_id) REFERENCES appuser(user_id);
```

4. Click the **Execute/Refresh** button
5. To insert data, open a new Query Tool and paste SQL INSERT commands

```bash
-- =====================
-- USERS
-- =====================
INSERT INTO appuser (username, email, password, is_admin) VALUES
('john_doe', 'john@example.com', 'hashed_password_123', FALSE),
('jane_smith', 'jane@example.com', 'hashed_password_456', FALSE),
('admin_user', 'admin@admin', 'hashed_password_789', TRUE),

-- =====================
-- MOVIES
-- =====================
INSERT INTO movie (title, genre, description) VALUES
('The Shawshank Redemption', 'Drama', 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.'),
('The Dark Knight', 'Action', 'When the menace known as the Joker wreaks havoc on Gotham, Batman must face one of the greatest tests of his ability to fight injustice.'),
('Inception', 'Sci-Fi', 'A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea into the mind of a CEO.'),
('Pulp Fiction', 'Crime', 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.'),
('The Matrix', 'Sci-Fi', 'A computer hacker learns about the true nature of reality and his role in the war against its controllers.'),
('Forrest Gump', 'Drama', 'The presidencies of Kennedy and Johnson, the Vietnam War, and other events unfold from the perspective of an Alabama man.'),
('The Godfather', 'Crime', 'The aging patriarch of an organized crime dynasty transfers control of his empire to his reluctant youngest son.'),
('Interstellar', 'Sci-Fi', 'A team of explorers travel through a wormhole in space in an attempt to ensure humanitys survival.'),
('Fight Club', 'Drama', 'An insomniac office worker and a soap salesman build a global organization to help vent male aggression.'),
('The Lord of the Rings', 'Fantasy', 'A young hobbit must destroy a powerful ring to save Middle-earth from the Dark Lord Sauron.');

-- =====================
-- RATINGS
-- =====================
INSERT INTO rating (score, created_at, movie_movie_id, appuser_user_id) VALUES
-- John's ratings
(9.5, '2024-01-15', 1, 1),
(9.0, '2024-01-16', 2, 1),
(8.5, '2024-01-17', 3, 1),
(8.0, '2024-02-01', 5, 1),

-- Jane's ratings
(10.0, '2024-01-20', 1, 2),
(7.5, '2024-01-21', 4, 2),
(9.0, '2024-01-22', 6, 2),
(8.5, '2024-02-05', 7, 2),


-- =====================
-- RECOMMENDATIONS
-- =====================
INSERT INTO recommendation (predicted_score, movie_movie_id, appuser_user_id) VALUES
-- Recommendations for John
(9.2, 4, 1),
(8.8, 7, 1),
(8.5, 10, 1),

-- Recommendations for Jane
(9.0, 2, 2),
(8.7, 3, 2),
(9.1, 8, 2),
```

6. Click the **Execute/Refresh** button

---

## Testing Production Database Locally

You can test the Render database from your local machine without deploying.

**1. Update your `.env`:**

```env
# Connect to Render database from local machine
DATABASE_URL=postgresql://render_db_qvd5_user:HB0wcEoEn2VUfjj49wM48hDYTImke3ha@dpg-d45s9sre5dus73cciigg-a.frankfurt-postgres.render.com/render_db_qvd5

DEBUG=true
```

**2. Run your local server:**

```bash
python manage.py runserver
```

Now your local Django connects to Render's database!

> ⚠️ **Warning:** You're editing production data. Be careful!

**⚠️ To switch back to local database:** Remove or comment out `DATABASE_URL` in `.env`.

---

## How It Works (settings.py)

```python
# If DATABASE_URL exists → use it (Render production)
if os.getenv("DATABASE_URL"):
    DATABASES = {
        "default": dj_database_url.parse(os.environ["DATABASE_URL"])
    }
# Otherwise → use local database settings
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "NAME": os.getenv("DB_NAME", "movieapp"),
            "USER": os.getenv("DB_USER", "movieapp"),
            "PASSWORD": os.getenv("DB_PASSWORD", "movieapp"),
        }
    }
```

---

## Quick Reference

| I want to...                | Set in `.env`                                           |
| --------------------------- | --------------------------------------------------------- |
| Use local database          | Remove `DATABASE_URL`, set `DB_HOST=localhost`, etc.  |
| Use Render database locally | Set `DATABASE_URL=postgresql://render...` (External URL |

---
