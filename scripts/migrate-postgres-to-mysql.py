"""Copy every Kain Na! table from the old PostgreSQL database into MySQL.

Start the Next.js app against the MySQL database once first, so it creates the tables. The copy then
replaces the contents of every table with the PostgreSQL rows, so run it only before switching traffic over.

    pip install "psycopg[binary]" pymysql
    PG_URL=postgresql://... MYSQL_URL=mysql://user:pass@host:3306/db python scripts/migrate-postgres-to-mysql.py
"""

import os
from datetime import datetime
from urllib.parse import unquote, urlparse

import psycopg
import pymysql

# Parents before children, so foreign keys resolve.
TABLES = ["catalog_items", "recipes", "catalog_recipes", "ingredients", "households", "users", "saved_recipes",
          "sessions", "invitations", "featured_weeks", "household_states"]


def mysql_connection(url):
    parts = urlparse(url)
    return pymysql.connect(host=parts.hostname, port=parts.port or 3306, user=unquote(parts.username), password=unquote(parts.password or ""),
                           database=parts.path.lstrip("/"), charset="utf8mb4", autocommit=False)


def mysql_value(table, column, value):
    if table == "saved_recipes" and column == "created_at" and isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    return value


def main():
    with psycopg.connect(os.environ["PG_URL"]) as source, mysql_connection(os.environ["MYSQL_URL"]) as target:
        cursor = target.cursor()
        for table in reversed(TABLES):
            cursor.execute(f"DELETE FROM `{table}`")
        for table in TABLES:
            with source.cursor() as read:
                read.execute(f'SELECT * FROM "{table}"')
                columns = [column.name for column in read.description]
                rows = [tuple(mysql_value(table, column, value) for column, value in zip(columns, row)) for row in read.fetchall()]
            if rows:
                names = ", ".join(f"`{column}`" for column in columns)
                updates = ", ".join(f"`{column}` = VALUES(`{column}`)" for column in columns)
                cursor.executemany(f"INSERT INTO `{table}` ({names}) VALUES ({', '.join(['%s'] * len(columns))}) ON DUPLICATE KEY UPDATE {updates}", rows)
            cursor.execute(f"SELECT COUNT(*) FROM `{table}`")
            print(f"{table}: {len(rows)} from PostgreSQL, {cursor.fetchone()[0]} in MySQL")
        target.commit()


if __name__ == "__main__":
    main()
