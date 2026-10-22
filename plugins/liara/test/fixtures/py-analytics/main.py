import os
import clickhouse_connect
from elasticsearch import Elasticsearch
from fastapi import FastAPI

app = FastAPI()
ch = clickhouse_connect.get_client(host=os.getenv("CLICKHOUSE_HOST"), port=int(os.getenv("CLICKHOUSE_PORT", "8123")))
es = Elasticsearch(os.getenv("ELASTICSEARCH_URL"))


@app.get("/")
def index():
    return {"ok": True}
