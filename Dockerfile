FROM python:3.12-slim
WORKDIR /app
COPY api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY api/main.py api/database.py ./
COPY kainna-web/src/data /catalog
ENV SALO_DATA_DIR=/catalog
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
