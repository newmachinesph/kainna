"""Small PostgreSQL adapter for the API's existing SQLite query interface."""

import re
from threading import Lock


_pool = None
_pool_lock = Lock()


def connection_pool(database_url):
    global _pool
    with _pool_lock:
        if _pool is None:
            from psycopg_pool import ConnectionPool

            _pool = ConnectionPool(
                database_url,
                kwargs={"row_factory": hybrid_row},
                min_size=1,
                max_size=8,
                timeout=30,
            )
    return _pool


class HybridRow(dict):
    """Allow both row['column'] and row[0], as sqlite3.Row does."""

    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)


def hybrid_row(cursor):
    if cursor.description is None:
        return lambda values: values
    columns = [column.name for column in cursor.description]

    def make_row(values):
        return HybridRow(zip(columns, values))

    return make_row


def postgres_sql(sql):
    """Translate the limited SQLite syntax used by this API."""

    translated = sql.replace("?", "%s")
    translated = re.sub(r"\bINSERT\s+OR\s+IGNORE\s+INTO\b", "INSERT INTO", translated, flags=re.I)
    if re.search(r"\bINSERT\s+OR\s+IGNORE\s+INTO\b", sql, flags=re.I):
        translated = translated.rstrip().rstrip(";") + " ON CONFLICT DO NOTHING"
    translated = re.sub(r"\bLIKE\b", "ILIKE", translated, flags=re.I)
    translated = re.sub(r"(\w+)\s*=\s*%s\s+COLLATE\s+NOCASE", r"\1 ILIKE %s", translated, flags=re.I)
    return translated


class PostgresConnection:
    def __init__(self, database_url):
        self.pool = connection_pool(database_url)
        self.raw = self.pool.getconn()

    def execute(self, sql, params=()):
        if sql.strip().upper() == "BEGIN IMMEDIATE":
            return None  # psycopg starts a transaction on the first statement.
        return self.raw.execute(postgres_sql(sql), params)

    def executemany(self, sql, rows):
        cursor = self.raw.cursor()
        cursor.executemany(postgres_sql(sql), rows)
        return cursor

    def executescript(self, script):
        for statement in script.split(";"):
            if statement.strip():
                self.execute(statement)

    def commit(self):
        self.raw.commit()

    def rollback(self):
        self.raw.rollback()

    def close(self):
        self.pool.putconn(self.raw)
