from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI(title="Gestor de Incidentes Tech", version="1.0")

DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("DB_NAME", "incidentes_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

def get_db_connection():
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        cursor_factory=RealDictCursor
    )
    return conn

@app.on_event("startup")
def startup_db():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS incidentes (
                id SERIAL PRIMARY KEY,
                titulo VARCHAR(100) NOT NULL,
                descripcion TEXT,
                gravedad VARCHAR(20) NOT NULL,
                responsable VARCHAR(50),
                estado VARCHAR(20) DEFAULT 'Abierto'
            );
        """)
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error conectando a la BD en el arranque: {e}")

class Incidente(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    gravedad: str
    responsable: str

@app.get("/")
def read_root():
    return {"mensaje": "Bienvenido al Sistema de Gestión de Incidentes Tecnológicos"}

@app.get("/incidentes", response_model=List[dict])
def listar_incidentes():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM incidentes;")
    incidentes = cur.fetchall()
    cur.close()
    conn.close()
    return incidentes

@app.post("/incidentes", status_code=201)
def crear_incidente(inc: Incidente):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO incidentes (titulo, descripcion, gravedad, responsable) VALUES (%s, %s, %s, %s) RETURNING id;",
        (inc.titulo, inc.descripcion, inc.gravedad, inc.responsable)
    )
    new_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    conn.close()
    return {"id": new_id, "mensaje": "Incidente reportado exitosamente"}